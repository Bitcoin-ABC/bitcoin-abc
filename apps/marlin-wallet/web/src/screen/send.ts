// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Navigation, Screen } from '../navigation';
import { AppSettings } from '../settings';
import { DEFAULT_DUST_SATS } from 'ecash-lib';
import { ChronikClient } from 'chronik-client';
import { Wallet } from 'ecash-wallet';
import {
    calculateMaxSpendableAmount,
    estimateTransactionFee,
    satsToXec,
} from '../amount';
import { buildAction } from '../wallet';
import { isValidECashAddress } from '../address';
import { parseBip21Uri, Bip21ParseResult } from '../bip21';
import { isPayButtonTransaction } from '../paybutton';
import { config } from '../config';
import { sendMessageToBackend, webViewLog, webViewError } from '../common';

const MIN_AMOUNT_XEC = satsToXec(Number(DEFAULT_DUST_SATS));

export interface SendScreenParams {
    ecashWallet: Wallet;
    navigation: Navigation;
    appSettings: AppSettings;
    syncWallet: () => Promise<void>;
}

export class SendScreen {
    private params: SendScreenParams;
    private sendOpReturnRaw: string | undefined = undefined;
    private ui: {
        recipientInput: HTMLInputElement;
        sendAmountInput: HTMLInputElement;
        amountSlider: HTMLInputElement;
        feeDisplay: HTMLElement;
        confirmSendBtn: HTMLButtonElement;
        cancelSendBtn: HTMLButtonElement;
        sliderMaxLabel: HTMLElement;
        logoContainer: HTMLElement;
    };

    constructor(params: SendScreenParams) {
        this.assertUIElements();

        this.params = params;
        this.initializeEventListeners();
    }

    // Update wallet reference (called when wallet is reloaded)
    updateWallet(newWallet: Wallet | null): void {
        this.params.ecashWallet = newWallet;
    }

    // Show the send screen
    async show(prefillOptions?: Bip21ParseResult): Promise<void> {
        webViewLog('Showing send screen');

        // Always refresh the available utxos before showing the send screen
        await this.params.syncWallet();

        // Initialize recipient address field
        if (prefillOptions) {
            // Set readonly BEFORE setting value to prevent input event from triggering BIP21 parsing
            this.ui.recipientInput.setAttribute('readonly', 'readonly');
            this.ui.recipientInput.value = prefillOptions.address;
            this.ui.recipientInput.classList.remove('invalid');
            this.ui.recipientInput.classList.add('valid'); // Mark as valid (already validated)
        } else {
            this.ui.recipientInput.value = '';
            this.ui.recipientInput.classList.remove('valid', 'invalid');
            this.ui.recipientInput.removeAttribute('readonly'); // Allow editing for manual entry
        }

        // Initialize amount field
        if (prefillOptions?.sats !== undefined && prefillOptions.sats > 0) {
            // Convert satoshis to XEC for display and disable the amount inputs
            const amountXec = satsToXec(prefillOptions.sats);
            this.ui.sendAmountInput.value = amountXec.toFixed(2);
            this.ui.sendAmountInput.setAttribute('readonly', 'readonly');
            this.ui.sendAmountInput.classList.remove('invalid');

            this.ui.amountSlider.value = amountXec.toString();
            this.ui.amountSlider.disabled = true;
        } else {
            // Prefill with minimum valid amount and make the inputs editable
            const amountXec = MIN_AMOUNT_XEC;
            this.ui.sendAmountInput.value = amountXec.toFixed(2);
            this.ui.sendAmountInput.classList.remove('valid', 'invalid');
            this.ui.sendAmountInput.removeAttribute('readonly');

            this.ui.amountSlider.value = amountXec.toString();
            this.ui.amountSlider.disabled = false;
        }

        // Store opReturnRaw for use when sending transaction, only for paybutton transactions
        this.sendOpReturnRaw =
            prefillOptions?.opReturnRaw &&
            isPayButtonTransaction(prefillOptions.opReturnRaw)
                ? prefillOptions.opReturnRaw
                : undefined;

        // Setup with current behavior
        this.setupHoldToSend();

        // Update the UI elements
        this.updatePayButtonLogoVisibility();
        this.updateSendScreenLimits();
        this.validateAmountField();
        this.updateSliderFromInput();
        this.updateSliderMarks(
            MIN_AMOUNT_XEC,
            calculateMaxSpendableAmount(this.params.ecashWallet),
        );
        this.updateFeeDisplay();

        this.params.navigation.showScreen(Screen.Send);
    }

    private assertUIElements(): void {
        this.ui = {
            recipientInput: document.getElementById(
                'recipient-address',
            ) as HTMLInputElement,
            sendAmountInput: document.getElementById(
                'send-amount',
            ) as HTMLInputElement,
            amountSlider: document.getElementById(
                'amount-slider',
            ) as HTMLInputElement,
            feeDisplay: document.getElementById('fee-display'),
            confirmSendBtn: document.getElementById(
                'confirm-send',
            ) as HTMLButtonElement,
            cancelSendBtn: document.getElementById(
                'cancel-send',
            ) as HTMLButtonElement,
            sliderMaxLabel: document.getElementById('slider-max-label'),
            logoContainer: document.getElementById('paybutton-logo-container'),
        };

        if (
            !this.ui.recipientInput ||
            !this.ui.sendAmountInput ||
            !this.ui.amountSlider ||
            !this.ui.feeDisplay ||
            !this.ui.confirmSendBtn ||
            !this.ui.cancelSendBtn ||
            !this.ui.sliderMaxLabel ||
            !this.ui.logoContainer
        ) {
            webViewError('Missing required UI elements for send screen');
            throw new Error('Missing required UI elements for send screen');
        }
    }

    // Initialize event listeners
    private initializeEventListeners(): void {
        // Setup amount input listener
        this.ui.sendAmountInput.addEventListener('input', (e: Event) =>
            this.handleAmountInput(e),
        );

        // Setup slider listener
        this.ui.amountSlider.addEventListener('input', (e: Event) => {
            this.handleSliderInput(e);
            this.updateFeeDisplay();
        });

        // Add recipient address input listener for fee updates and validation
        this.ui.recipientInput.addEventListener('input', () => {
            this.validateAddressField();
            this.updateFeeDisplay();
        });
    }

    // Validate address field and update UI
    private validateAddressField(): void {
        const input = this.ui.recipientInput.value.trim();

        // Clear previous validation states
        this.ui.recipientInput.classList.remove('invalid');
        this.ui.recipientInput.classList.remove('valid');

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
            if (this.ui.recipientInput.hasAttribute('readonly')) {
                // Just mark as valid, don't populate (already set by QR/NFC scan)
                this.ui.recipientInput.classList.add('valid');
                return;
            }

            // User pasted a BIP21 URI - populate all fields
            this.handleBip21Paste(bip21Result);
            return;
        }

        // Otherwise validate as a plain address.
        // This is only used for testnet where then BIP21 prefix differs from the address prefix.
        // This implies that a valid address is also a valid BIP21 URI.
        if (isValidECashAddress(input)) {
            this.ui.recipientInput.classList.add('valid');
            return;
        }

        this.ui.recipientInput.classList.add('invalid');
    }

    private handleBip21Paste(
        bip21Result: ReturnType<typeof parseBip21Uri>,
    ): void {
        if (!bip21Result) {
            return;
        }

        // Set the address (plain address, not the full URI)
        this.ui.recipientInput.value = bip21Result.address;
        this.ui.recipientInput.setAttribute('readonly', 'readonly');
        this.ui.recipientInput.classList.add('valid');

        // Store opReturnRaw for use when sending transaction, only for paybutton transactions
        this.sendOpReturnRaw =
            bip21Result.opReturnRaw &&
            isPayButtonTransaction(bip21Result.opReturnRaw)
                ? bip21Result.opReturnRaw
                : undefined;
        this.updatePayButtonLogoVisibility();

        // Set amount if provided
        if (
            bip21Result.sats !== undefined &&
            bip21Result.sats >= DEFAULT_DUST_SATS
        ) {
            const amountXec = satsToXec(bip21Result.sats);

            this.ui.sendAmountInput.value = amountXec.toFixed(2);
            this.ui.sendAmountInput.setAttribute('readonly', 'readonly');
            this.validateAmountField();

            this.ui.amountSlider.value = amountXec.toString();
            this.ui.amountSlider.disabled = true;
        }

        // Trigger fee calculation
        this.updateFeeDisplay();
    }

    // Update send screen with maximum spendable amount
    private updateSendScreenLimits(): void {
        const maxSpendable = calculateMaxSpendableAmount(
            this.params.ecashWallet,
        );

        // Update amount input max attribute
        this.ui.sendAmountInput.max = maxSpendable.toString();

        // Update slider max value and label
        this.ui.amountSlider.max = maxSpendable.toString();

        // Update slider max label
        this.ui.sliderMaxLabel.textContent = `${maxSpendable.toFixed(2)} ${
            config.ticker
        }`;
    }

    // Update fee display
    private updatePayButtonLogoVisibility(): void {
        if (
            this.sendOpReturnRaw &&
            isPayButtonTransaction(this.sendOpReturnRaw)
        ) {
            this.ui.logoContainer.style.display = 'flex';
        } else {
            this.ui.logoContainer.style.display = 'none';
        }
    }

    private updateFeeDisplay(): void {
        const recipientAddress = this.ui.recipientInput.value.trim();
        let amount = parseFloat(this.ui.sendAmountInput.value);

        // Hide if address or amount is invalid
        if (
            !recipientAddress ||
            !isValidECashAddress(recipientAddress) ||
            isNaN(amount) ||
            amount <= 0
        ) {
            this.ui.feeDisplay.style.display = 'none';
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
            this.params.ecashWallet,
            recipientAddress,
            amount,
            this.sendOpReturnRaw,
        );

        // Insufficient balance - calculate for max spendable amount
        if (!feeEstimate) {
            amount = calculateMaxSpendableAmount(this.params.ecashWallet);
            feeEstimate = estimateTransactionFee(
                this.params.ecashWallet,
                recipientAddress,
                amount,
                this.sendOpReturnRaw,
            );
            errorMessage = `Insufficient balance`;
        }

        // Build the html fee block heading depending on the error condition
        let feeBlockHeading = 'Transaction Details';
        let feeBlockHeadingClasses = 'title';
        if (errorMessage) {
            this.ui.feeDisplay.classList.add('error');
            feeBlockHeading = errorMessage;
            feeBlockHeadingClasses += ' error';
        } else {
            this.ui.feeDisplay.classList.remove('error');
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

        this.ui.feeDisplay.innerHTML = html;
        this.ui.feeDisplay.style.display = 'block';
    }

    // Amount input handling to prevent more than 2 decimals
    private handleAmountInput(event: Event): void {
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
        this.updateSliderFromInput();

        // Run validation after input is processed
        this.validateAmountField();
    }

    // Handle slider input
    private handleSliderInput(event: Event): void {
        const slider = event.target as HTMLInputElement;
        const value = parseFloat(slider.value);

        // Update the amount input field immediately for visual feedback
        this.ui.sendAmountInput.value = value.toFixed(2);

        // Validate immediately without throttling
        this.validateAmountField();
    }

    // Update slider from input field
    private updateSliderFromInput(): void {
        const value = parseFloat(this.ui.sendAmountInput.value);
        const minAmount = MIN_AMOUNT_XEC;
        const maxAmount = calculateMaxSpendableAmount(this.params.ecashWallet);

        // Clamp value to slider range
        const clampedValue = Math.max(minAmount, Math.min(value, maxAmount));

        // Update slider value
        this.ui.amountSlider.value = clampedValue.toString();

        // Update slider max if balance changed
        if (maxAmount !== parseFloat(this.ui.amountSlider.max)) {
            this.ui.amountSlider.max = maxAmount.toString();
            this.ui.sliderMaxLabel.textContent = `${maxAmount.toFixed(2)} ${
                config.ticker
            }`;

            // Update slider marks for new range
            this.updateSliderMarks(minAmount, maxAmount);
        }
    }

    // Update slider marks based on current range
    private updateSliderMarks(minAmount: number, maxAmount: number): void {
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
    private validateAmountField(): void {
        const amount = parseFloat(this.ui.sendAmountInput.value);
        const minAmount = satsToXec(Number(DEFAULT_DUST_SATS));
        const maxAmount = calculateMaxSpendableAmount(this.params.ecashWallet);

        // Clear previous validation states
        this.ui.sendAmountInput.classList.remove('invalid');
        this.ui.sendAmountInput.classList.remove('valid');

        // Check if amount is valid
        if (isNaN(amount) || amount <= 0) {
            this.ui.sendAmountInput.classList.add('invalid');
            this.ui.confirmSendBtn.disabled = true;
            const btnSpan = this.ui.confirmSendBtn.querySelector('span');
            if (btnSpan) {
                btnSpan.textContent = 'Enter Amount';
            }
            return;
        }

        if (amount < minAmount) {
            this.ui.sendAmountInput.classList.add('invalid');
            this.ui.confirmSendBtn.disabled = true;
            const btnSpan = this.ui.confirmSendBtn.querySelector('span');
            if (btnSpan) {
                btnSpan.textContent = `Min: ${minAmount} ${config.ticker}`;
            }
            return;
        }

        if (amount > maxAmount) {
            this.ui.sendAmountInput.classList.add('invalid');
            this.ui.confirmSendBtn.disabled = true;
            const btnSpan = this.ui.confirmSendBtn.querySelector('span');
            if (btnSpan) {
                btnSpan.textContent = `Max: ${maxAmount.toFixed(2)} ${
                    config.ticker
                }`;
            }
            return;
        }

        // Amount is valid
        this.ui.sendAmountInput.classList.add('valid');
        this.ui.confirmSendBtn.disabled = false;
        const btnSpan = this.ui.confirmSendBtn.querySelector('span');
        if (btnSpan) {
            btnSpan.textContent = this.params.appSettings.requireHoldToSend
                ? 'Hold to send'
                : 'Send';
        }
    }

    // Send button setup - either hold-to-send or simple click based on settings
    private setupHoldToSend(): void {
        // Re-setup send button behavior based on current app setting
        // Remove all existing event listeners by cloning and replacing
        const button = this.ui.confirmSendBtn.cloneNode(
            true,
        ) as HTMLButtonElement;
        this.ui.confirmSendBtn.parentNode?.replaceChild(
            button,
            this.ui.confirmSendBtn,
        );
        // Update the UI element reference
        this.ui.confirmSendBtn = document.getElementById(
            'confirm-send',
        ) as HTMLButtonElement;

        // If hold-to-send is disabled, use simple click behavior
        if (!this.params.appSettings.requireHoldToSend) {
            button.addEventListener('click', async () => {
                await this.validateAndSend();
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
            const amount = parseFloat(this.ui.sendAmountInput.value);
            const address = this.ui.recipientInput.value.trim();

            // Validate address
            if (!address || !isValidECashAddress(address)) {
                // Play warning haptic immediately
                sendMessageToBackend('HAPTIC_FEEDBACK', 'notificationWarning');
                this.ui.recipientInput.focus();
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
                await this.validateAndSend();
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

    private async validateAndSend(): Promise<void> {
        const amount = parseFloat(this.ui.sendAmountInput.value);
        const address = this.ui.recipientInput.value.trim();

        // Validate address
        if (!address || !isValidECashAddress(address)) {
            this.ui.recipientInput.focus();
            return;
        }

        // Validate amount
        this.validateAmountField();
        if (this.ui.confirmSendBtn.disabled) {
            return; // Amount validation failed
        }

        // All validations passed, proceed with sending
        try {
            // Convert XEC to satoshis (1 XEC = 100 satoshis)
            const sats = Math.round(amount * 100);
            const action = buildAction(
                this.params.ecashWallet,
                address,
                sats,
                this.sendOpReturnRaw,
            );
            const builtAction = action.build();

            if (
                this.sendOpReturnRaw &&
                isPayButtonTransaction(this.sendOpReturnRaw)
            ) {
                // For PayButton transactions, we broadcast to the PayButton node first
                // to reduce the latency. Then we attempt to broadcast to the main node
                // as well which may fail because the tx might have been relayed already.
                try {
                    const paybuttonChronik = new ChronikClient([
                        'https://xec.paybutton.io',
                    ]);
                    const txsToBroadcast = builtAction.txs.map(tx =>
                        tx.toHex(),
                    );
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
            this.params.navigation.showScreen(Screen.Main);
        }
    }
}
