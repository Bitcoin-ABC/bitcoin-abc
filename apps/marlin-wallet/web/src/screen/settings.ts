// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Navigation, Screen } from '../navigation';
import { AppSettings, saveSettings } from '../settings';
import { getMnemonic, storeMnemonic, validateMnemonic } from '../mnemonic';
import { WalletData } from '../wallet';
import { Fiat } from 'ecash-price';
import { webViewLog, webViewError } from '../common';
import { DEFAULT_LOCALE, getAvailableLocales } from '../i18n';

export interface SettingsScreenParams {
    appSettings: AppSettings;
    wallet: WalletData | null;
    navigation: Navigation;
}

export class SettingsScreen {
    private params: SettingsScreenParams;
    private onHoldToSendChangeCallback: (() => void) | null = null;
    private onPrimaryBalanceChangeCallback: (() => Promise<void>) | null = null;
    private onFiatCurrencyChangeCallback: (() => Promise<void>) | null = null;
    private onLocaleChangeCallback: ((locale: string) => Promise<void>) | null =
        null;
    private onMnemonicSavedCallback:
        | ((mnemonic: string) => Promise<void>)
        | null = null;
    private ui: {
        holdToSendToggle: HTMLInputElement;
        primaryBalanceToggle: HTMLInputElement;
        fiatCurrencySelect: HTMLSelectElement;
        languageSelect: HTMLSelectElement;
        settingsBackBtn: HTMLButtonElement;
        editMnemonicBtn: HTMLButtonElement;
        cancelMnemonicEditBtn: HTMLButtonElement;
        closeMnemonicModalBtn: HTMLButtonElement;
        saveMnemonicEditBtn: HTMLButtonElement;
        mnemonicText: HTMLTextAreaElement;
        mnemonicEditModal: HTMLElement;
        mnemonicEditText: HTMLTextAreaElement;
        mnemonicValidation: HTMLElement;
    };

    constructor(params: SettingsScreenParams) {
        this.params = params;
        this.assertUIElements();
        this.initializeEventListeners();
    }

    // Register callback for when hold-to-send setting changes
    onHoldToSendChange(callback: () => void): void {
        this.onHoldToSendChangeCallback = callback;
    }

    // Register callback for when primary balance type changes
    onPrimaryBalanceChange(callback: () => Promise<void>): void {
        this.onPrimaryBalanceChangeCallback = callback;
    }

    // Register callback for when fiat currency changes
    onFiatCurrencyChange(callback: () => Promise<void>): void {
        this.onFiatCurrencyChangeCallback = callback;
    }

    // Register callback for when locale changes
    onLocaleChange(callback: (locale: string) => Promise<void>): void {
        this.onLocaleChangeCallback = callback;
    }

    // Register callback for when mnemonic is saved
    onMnemonicSaved(callback: (mnemonic: string) => Promise<void>): void {
        this.onMnemonicSavedCallback = callback;
    }

    private assertUIElements(): void {
        this.ui = {
            holdToSendToggle: document.getElementById(
                'hold-to-send-toggle',
            ) as HTMLInputElement,
            primaryBalanceToggle: document.getElementById(
                'primary-balance-toggle',
            ) as HTMLInputElement,
            fiatCurrencySelect: document.getElementById(
                'fiat-currency-select',
            ) as HTMLSelectElement,
            languageSelect: document.getElementById(
                'language-select',
            ) as HTMLSelectElement,
            settingsBackBtn: document.getElementById(
                'settings-back-btn',
            ) as HTMLButtonElement,
            editMnemonicBtn: document.getElementById(
                'edit-mnemonic-btn',
            ) as HTMLButtonElement,
            cancelMnemonicEditBtn: document.getElementById(
                'cancel-mnemonic-edit',
            ) as HTMLButtonElement,
            closeMnemonicModalBtn: document.getElementById(
                'close-mnemonic-modal',
            ) as HTMLButtonElement,
            saveMnemonicEditBtn: document.getElementById(
                'save-mnemonic-edit',
            ) as HTMLButtonElement,
            mnemonicText: document.getElementById(
                'mnemonic-text',
            ) as HTMLTextAreaElement,
            mnemonicEditModal: document.getElementById(
                'mnemonic-edit-modal',
            ) as HTMLElement,
            mnemonicEditText: document.getElementById(
                'mnemonic-edit-text',
            ) as HTMLTextAreaElement,
            mnemonicValidation: document.getElementById(
                'mnemonic-validation',
            ) as HTMLElement,
        };

        if (
            !this.ui.holdToSendToggle ||
            !this.ui.primaryBalanceToggle ||
            !this.ui.fiatCurrencySelect ||
            !this.ui.languageSelect ||
            !this.ui.settingsBackBtn ||
            !this.ui.editMnemonicBtn ||
            !this.ui.cancelMnemonicEditBtn ||
            !this.ui.closeMnemonicModalBtn ||
            !this.ui.saveMnemonicEditBtn ||
            !this.ui.mnemonicText ||
            !this.ui.mnemonicEditModal ||
            !this.ui.mnemonicEditText ||
            !this.ui.mnemonicValidation
        ) {
            webViewError('Missing required UI elements for settings screen');
            throw new Error('Missing required UI elements for settings screen');
        }
    }

    // Initialize settings UI and event listeners
    private initializeEventListeners(): void {
        // Setup hold-to-send toggle and apply saved setting
        // Apply saved setting to toggle UI
        this.ui.holdToSendToggle.checked =
            this.params.appSettings.requireHoldToSend;

        // Add change listener
        this.ui.holdToSendToggle.addEventListener('change', () => {
            this.params.appSettings.requireHoldToSend =
                this.ui.holdToSendToggle.checked;
            webViewLog(
                `Hold to send ${this.params.appSettings.requireHoldToSend ? 'enabled' : 'disabled'}`,
            );

            // Save settings to localStorage
            saveSettings(this.params.appSettings);

            // Call registered callback
            if (this.onHoldToSendChangeCallback) {
                this.onHoldToSendChangeCallback();
            }
        });

        // Setup primary balance toggle and apply saved setting
        // Apply saved setting to toggle UI
        // Toggle is checked when primary balance is Fiat
        this.ui.primaryBalanceToggle.checked =
            this.params.appSettings.primaryBalanceType !== 'XEC';

        // Add change listener
        this.ui.primaryBalanceToggle.addEventListener('change', async () => {
            this.params.appSettings.primaryBalanceType = this.ui
                .primaryBalanceToggle.checked
                ? 'Fiat'
                : 'XEC';
            webViewLog(
                `Primary balance set to ${this.params.appSettings.primaryBalanceType}`,
            );

            // Save settings to localStorage
            saveSettings(this.params.appSettings);

            // Call registered callback
            if (this.onPrimaryBalanceChangeCallback) {
                await this.onPrimaryBalanceChangeCallback();
            }
        });

        // Setup fiat currency dropdown
        // Populate dropdown with all available fiat currencies.
        // Move the USD and EUR to the top, keep the others in alphabetical
        // order.
        let allFiats = Fiat.listAll();
        allFiats = allFiats.filter(
            fiat => fiat.toString() !== 'USD' && fiat.toString() !== 'EUR',
        );
        allFiats.unshift(Fiat.USD, Fiat.EUR);

        allFiats.forEach(fiat => {
            const option = document.createElement('option');
            option.value = fiat.toString();
            option.textContent =
                fiat.toString().toUpperCase() +
                ' - ' +
                fiat.symbol(this.params.appSettings.locale) +
                ' - ' +
                fiat.name(this.params.appSettings.locale);
            this.ui.fiatCurrencySelect.appendChild(option);
        });

        // Add a separator after the USD and EUR
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.value = 'separator';
        separator.textContent = '--------------------------------';
        this.ui.fiatCurrencySelect.insertBefore(
            separator,
            this.ui.fiatCurrencySelect.options[2],
        );

        // Set current selection
        this.ui.fiatCurrencySelect.value =
            this.params.appSettings.fiatCurrency.toString();

        // Add change listener
        this.ui.fiatCurrencySelect.addEventListener('change', async () => {
            this.params.appSettings.fiatCurrency = new Fiat(
                this.ui.fiatCurrencySelect.value,
            );
            webViewLog(
                `Fiat currency set to ${this.params.appSettings.fiatCurrency.toString().toUpperCase()}`,
            );

            // Save settings to localStorage
            saveSettings(this.params.appSettings);

            // Call registered callback
            if (this.onFiatCurrencyChangeCallback) {
                await this.onFiatCurrencyChangeCallback();
            }
        });

        getAvailableLocales().forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            this.ui.languageSelect.appendChild(option);
        });

        // Set current selection
        this.ui.languageSelect.value =
            this.params.appSettings.locale || DEFAULT_LOCALE;

        // Add change listener
        this.ui.languageSelect.addEventListener('change', async () => {
            const newLocale = this.ui.languageSelect.value;
            this.params.appSettings.locale = newLocale;
            webViewLog(`Locale set to ${newLocale}`);

            // Save settings to localStorage
            saveSettings(this.params.appSettings);

            // Call registered callback
            if (this.onLocaleChangeCallback) {
                await this.onLocaleChangeCallback(newLocale);
            }
        });

        // Setup settings back button
        this.ui.settingsBackBtn.addEventListener('click', () => {
            this.params.navigation.showScreen(Screen.Main);
        });

        // Setup mnemonic edit buttons
        this.ui.editMnemonicBtn.addEventListener('click', () => {
            this.showMnemonicEditModal();
        });

        this.ui.cancelMnemonicEditBtn.addEventListener('click', () => {
            this.hideMnemonicEditModal();
            this.hideValidationMessage();
        });

        this.ui.closeMnemonicModalBtn.addEventListener('click', () => {
            this.hideMnemonicEditModal();
            this.hideValidationMessage();
        });

        this.ui.saveMnemonicEditBtn.addEventListener('click', async () => {
            await this.saveMnemonic(this.ui.mnemonicEditText.value.trim());
        });

        this.updateMnemonicDisplay();
    }

    // Mnemonic management functions
    private updateMnemonicDisplay(): void {
        const walletMnemonic = getMnemonic(this.params.wallet);
        if (walletMnemonic) {
            this.ui.mnemonicText.value = walletMnemonic;
        }
    }

    private showMnemonicEditModal(): void {
        const walletMnemonic = getMnemonic(this.params.wallet);
        this.ui.mnemonicEditText.value = walletMnemonic ? walletMnemonic : '';

        this.ui.mnemonicValidation.style.display = 'none';

        this.ui.mnemonicEditModal.style.display = 'flex';
        this.ui.mnemonicEditModal.classList.remove('hidden');
    }

    private hideMnemonicEditModal(): void {
        this.ui.mnemonicEditModal.style.display = 'none';
        this.ui.mnemonicEditModal.classList.add('hidden');
    }

    private showValidationMessage(
        message: string,
        isError: boolean = true,
    ): void {
        this.ui.mnemonicValidation.textContent = message;
        this.ui.mnemonicValidation.className = `validation-message ${
            isError ? 'error' : 'success'
        }`;
        this.ui.mnemonicValidation.style.display = 'block';
    }

    private hideValidationMessage(): void {
        this.ui.mnemonicValidation.style.display = 'none';
    }

    private async saveMnemonic(newMnemonic: string): Promise<boolean> {
        try {
            // Validate the mnemonic
            if (!validateMnemonic(newMnemonic)) {
                this.showValidationMessage(
                    'Invalid mnemonic. Please enter a valid 12-word recovery phrase.',
                );
                return false;
            }

            // Store the new mnemonic
            await storeMnemonic(newMnemonic);

            // Update the wallet with the new mnemonic
            if (this.params.wallet) {
                this.params.wallet.mnemonic = newMnemonic;
            }

            // Call registered callback to reload wallet with the new mnemonic
            if (this.onMnemonicSavedCallback) {
                await this.onMnemonicSavedCallback(newMnemonic);
            }

            // Ensure main screen is visible and wallet is displayed
            this.params.navigation.showScreen(Screen.Main);

            // Update the display
            this.updateMnemonicDisplay();

            // Show success message
            this.showValidationMessage(
                'Mnemonic updated successfully! Wallet reloaded.',
                false,
            );

            // Disable the save button
            this.ui.saveMnemonicEditBtn.disabled = true;

            // Hide modal after a short delay
            setTimeout(() => {
                this.hideMnemonicEditModal();
                this.hideValidationMessage();
                // Re-enable the save button
                this.ui.saveMnemonicEditBtn.disabled = false;
            }, 2000);

            return true;
        } catch (error) {
            webViewError('Error saving mnemonic:', error);
            this.showValidationMessage(
                'Failed to save mnemonic. Please try again.',
            );
            return false;
        }
    }
}
