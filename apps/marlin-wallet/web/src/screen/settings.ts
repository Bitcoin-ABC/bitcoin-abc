// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Navigation, Screen } from '../navigation';
import { AppSettings, saveSettings } from '../settings';
import {
    getMnemonic,
    storeMnemonic,
    validateMnemonic,
    getBIP39Wordlist,
} from '../mnemonic';
import { WalletData } from '../wallet';
import { Fiat } from 'ecash-price';
import { webViewLog, webViewError } from '../common';
import { DEFAULT_LOCALE, getAvailableLocales, t } from '../i18n';
import eyeIcon from '../assets/eye.svg';

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
        mnemonicWordsContainer: HTMLElement;
        clearMnemonicBtn: HTMLButtonElement;
        mnemonicValidation: HTMLElement;
        modalContent: HTMLElement | null;
        showMnemonicBtn: HTMLButtonElement;
        eyeIcon: HTMLImageElement;
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
            mnemonicWordsContainer: document.getElementById(
                'mnemonic-words-container',
            ) as HTMLElement,
            clearMnemonicBtn: document.getElementById(
                'clear-mnemonic-btn',
            ) as HTMLButtonElement,
            mnemonicValidation: document.getElementById(
                'mnemonic-validation',
            ) as HTMLElement,
            modalContent: document
                .getElementById('mnemonic-edit-modal')
                ?.querySelector('.modal-content') as HTMLElement,
            showMnemonicBtn: document.getElementById(
                'show-mnemonic-btn',
            ) as HTMLButtonElement,
            eyeIcon: document.getElementById('eye-icon') as HTMLImageElement,
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
            !this.ui.mnemonicWordsContainer ||
            !this.ui.clearMnemonicBtn ||
            !this.ui.mnemonicValidation ||
            !this.ui.modalContent ||
            !this.ui.showMnemonicBtn ||
            !this.ui.eyeIcon
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
        this.populateFiatCurrencyDropdown();

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

        this.populateLanguageDropdown();

        // Add change listener
        this.ui.languageSelect.addEventListener('change', async () => {
            const newLocale = this.ui.languageSelect.value;
            this.params.appSettings.locale = newLocale;
            webViewLog(`Locale set to ${newLocale}`);

            // Save settings to localStorage
            saveSettings(this.params.appSettings);

            this.populateFiatCurrencyDropdown();

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
            await this.saveMnemonic();
        });

        // Setup clear button
        this.ui.clearMnemonicBtn.addEventListener('click', () => {
            this.clearAllMnemonicFields();
        });

        // Set eye icon source
        this.ui.eyeIcon.src = eyeIcon;

        // Setup show/hide mnemonic button - toggle on click
        this.ui.showMnemonicBtn.addEventListener('click', () => {
            const isBlurred =
                this.ui.mnemonicText.classList.contains('blurred');
            if (isBlurred) {
                this.ui.mnemonicText.classList.remove('blurred');
                this.ui.eyeIcon.style.opacity = '1';
            } else {
                this.ui.mnemonicText.classList.add('blurred');
                this.ui.eyeIcon.style.opacity = '0.6';
            }
        });

        // Prevent text selection and copying when blurred. It doesn't prevent
        // all copy events (and the text is still in the page source code) but
        // it's better than nothing.
        this.ui.mnemonicText.addEventListener('selectstart', e => {
            if (this.ui.mnemonicText.classList.contains('blurred')) {
                e.preventDefault();
                return false;
            }
        });
        this.ui.mnemonicText.addEventListener('copy', e => {
            if (this.ui.mnemonicText.classList.contains('blurred')) {
                e.preventDefault();
                return false;
            }
        });
        this.ui.mnemonicText.addEventListener('cut', e => {
            if (this.ui.mnemonicText.classList.contains('blurred')) {
                e.preventDefault();
                return false;
            }
        });

        this.updateMnemonicDisplay();
    }

    // Populate fiat currency dropdown with all available currencies
    private populateFiatCurrencyDropdown(): void {
        // Clear existing options
        this.ui.fiatCurrencySelect.innerHTML = '';

        // Get all fiat currencies, move USD and EUR to the top, keep the others in alphabetical order
        let allFiats = Fiat.listAll();
        allFiats = allFiats.filter(
            fiat => fiat.toString() !== 'USD' && fiat.toString() !== 'EUR',
        );
        allFiats.unshift(Fiat.USD, Fiat.EUR);

        // Create option elements for each fiat currency
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
    }

    // Populate language dropdown with all available languages
    private populateLanguageDropdown(): void {
        // Clear existing options
        this.ui.languageSelect.innerHTML = '';

        // Get all available locales
        const allLocales = getAvailableLocales();

        // Find default locale and separate it from the rest
        const defaultLocale = allLocales.find(
            lang => lang.code === DEFAULT_LOCALE,
        );
        const otherLocales = allLocales.filter(
            lang => lang.code !== DEFAULT_LOCALE,
        );

        // Add English first
        if (defaultLocale) {
            const option = document.createElement('option');
            option.value = defaultLocale.code;
            option.textContent = defaultLocale.name;
            this.ui.languageSelect.appendChild(option);
        }

        // Add separator after default locale
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.value = 'separator';
        separator.textContent = '--------------------------------';
        this.ui.languageSelect.appendChild(separator);

        // Add all other languages
        otherLocales.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            this.ui.languageSelect.appendChild(option);
        });

        // Set current selection
        this.ui.languageSelect.value =
            this.params.appSettings.locale || DEFAULT_LOCALE;
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
        const words = walletMnemonic ? walletMnemonic.split(' ') : [];

        // Populate word selectors
        this.populateWordSelectors(words);

        this.ui.mnemonicValidation.style.display = 'none';

        this.ui.mnemonicEditModal.style.display = 'flex';
        this.ui.mnemonicEditModal.classList.remove('hidden');
    }

    // Populate 12 filterable dropdown selectors with BIP39 wordlist
    private populateWordSelectors(initialWords: string[] = []): void {
        const container = this.ui.mnemonicWordsContainer;
        container.innerHTML = '';

        const wordlist = getBIP39Wordlist();
        const NUM_WORDS = 12;

        for (let i = 0; i < NUM_WORDS; i++) {
            const wordGroup = document.createElement('div');
            wordGroup.className = 'mnemonic-word-group';

            const label = document.createElement('label');
            label.textContent = `#${i + 1}`;
            label.className = 'mnemonic-word-label';

            // Create wrapper for input and dropdown
            const inputWrapper = document.createElement('div');
            inputWrapper.className = 'mnemonic-input-wrapper';

            // Create input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'mnemonic-word-input';
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('spellcheck', 'false');
            input.setAttribute('data-word-index', i.toString());

            // Create dropdown for filtered results
            const dropdown = document.createElement('div');
            dropdown.className = 'mnemonic-word-dropdown';
            dropdown.style.display = 'none';

            // Set initial value if provided
            if (initialWords[i]) {
                input.value = initialWords[i];
            }

            // Filter and show dropdown
            const showFilteredOptions = (searchTerm: string) => {
                dropdown.innerHTML = '';
                const term = searchTerm.toLowerCase().trim();

                if (term === '') {
                    dropdown.style.display = 'none';
                    return;
                }

                // Filter words that start with the search term
                const filtered = wordlist.filter(word =>
                    word.toLowerCase().startsWith(term),
                );

                if (filtered.length === 0) {
                    dropdown.style.display = 'none';
                    return;
                }

                filtered.forEach(word => {
                    const option = document.createElement('div');
                    option.className = 'mnemonic-dropdown-option';
                    option.textContent = word;

                    const selectWord = () => {
                        input.value = word;
                        dropdown.style.display = 'none';
                        // Move to next input if available
                        const nextIndex = i + 1;
                        if (nextIndex < NUM_WORDS) {
                            const nextInput = container.querySelector(
                                `input[data-word-index="${nextIndex}"]`,
                            ) as HTMLInputElement;
                            if (nextInput) {
                                nextInput.focus();
                            }
                        }
                    };

                    option.addEventListener('mousedown', e => {
                        e.preventDefault(); // Prevent input blur
                        selectWord();
                    });
                    option.addEventListener('click', selectWord);
                    dropdown.appendChild(option);
                });

                // Position dropdown relative to input using fixed positioning
                const inputRect = input.getBoundingClientRect();
                dropdown.style.top = `${inputRect.bottom + 2}px`;
                dropdown.style.left = `${inputRect.left}px`;
                dropdown.style.width = `${inputRect.width}px`;
                dropdown.style.display = 'block';
            };

            // Handle input changes
            input.addEventListener('input', () => {
                if (input.value.trim()) {
                    showFilteredOptions(input.value);
                }
            });

            // Hide dropdown when clicking outside
            document.addEventListener('click', (e: MouseEvent) => {
                if (
                    !inputWrapper.contains(e.target as Node) &&
                    !dropdown.contains(e.target as Node)
                ) {
                    dropdown.style.display = 'none';
                }
            });

            // Validate on blur - ensure it's a valid BIP39 word
            input.addEventListener('blur', () => {
                const value = input.value.trim().toLowerCase();
                if (value) {
                    // Check if it's a valid BIP39 word
                    const exactWord = wordlist.find(
                        word => word.toLowerCase() === value,
                    );
                    if (exactWord) {
                        input.value = exactWord;
                    } else {
                        // Clear invalid input
                        input.value = '';
                    }
                }
            });

            inputWrapper.appendChild(input);
            // Append dropdown to modal-content to escape scrolling container
            this.ui.modalContent.appendChild(dropdown);
            wordGroup.appendChild(label);
            wordGroup.appendChild(inputWrapper);
            container.appendChild(wordGroup);
        }
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

    private async saveMnemonic(): Promise<boolean> {
        try {
            // Collect words from inputs
            const words: string[] = [];
            const inputs = this.ui.mnemonicWordsContainer.querySelectorAll(
                '.mnemonic-word-input',
            ) as NodeListOf<HTMLInputElement>;

            inputs.forEach(input => {
                const value = input.value.trim();
                if (value) {
                    words.push(value);
                }
            });

            const mnemonic = words.join(' ');

            // Validate the mnemonic
            if (!validateMnemonic(mnemonic)) {
                this.showValidationMessage(t('mnemonic.invalidMnemonic'));
                return false;
            }

            // Store the new mnemonic
            storeMnemonic(mnemonic);

            // Update the wallet with the new mnemonic
            if (this.params.wallet) {
                this.params.wallet.mnemonic = mnemonic;
            }

            // Call registered callback to reload wallet with the new mnemonic
            if (this.onMnemonicSavedCallback) {
                await this.onMnemonicSavedCallback(mnemonic);
            }

            // Ensure main screen is visible and wallet is displayed
            this.params.navigation.showScreen(Screen.Main);

            // Update the display
            this.updateMnemonicDisplay();

            // Show success message
            this.showValidationMessage(t('mnemonic.mnemonicSaved'), false);

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
            this.showValidationMessage(t('mnemonic.failedToSave'));
            return false;
        }
    }

    // Clear all mnemonic word input fields
    private clearAllMnemonicFields(): void {
        const inputs = this.ui.mnemonicWordsContainer.querySelectorAll(
            '.mnemonic-word-input',
        ) as NodeListOf<HTMLInputElement>;

        inputs.forEach(input => {
            input.value = '';
        });

        // Hide any dropdowns that might be open
        const dropdowns = this.ui.mnemonicWordsContainer.querySelectorAll(
            '.mnemonic-word-dropdown',
        ) as NodeListOf<HTMLElement>;

        dropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });

        // Clear validation message
        this.hideValidationMessage();
    }
}
