// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Navigation, Screen } from '../navigation';
import { AppSettings, saveSettings } from '../settings';
import { getMnemonic, storeMnemonic, validateMnemonic } from '../mnemonic';
import { WalletData } from '../wallet';
import { webViewLog, webViewError } from '../common';

export interface SettingsScreenParams {
    appSettings: AppSettings;
    wallet: WalletData | null;
    navigation: Navigation;
}

export class SettingsScreen {
    private params: SettingsScreenParams;
    private onHoldToSendChangeCallback: (() => void) | null = null;
    private onPrimaryBalanceChangeCallback: (() => Promise<void>) | null = null;
    private onMnemonicSavedCallback:
        | ((mnemonic: string) => Promise<void>)
        | null = null;

    constructor(params: SettingsScreenParams) {
        this.params = params;
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

    // Register callback for when mnemonic is saved
    onMnemonicSaved(callback: (mnemonic: string) => Promise<void>): void {
        this.onMnemonicSavedCallback = callback;
    }

    // Initialize settings UI and event listeners
    private initializeEventListeners(): void {
        // Setup hold-to-send toggle and apply saved setting
        const holdToSendToggle = document.getElementById(
            'hold-to-send-toggle',
        ) as HTMLInputElement;
        if (holdToSendToggle) {
            // Apply saved setting to toggle UI
            holdToSendToggle.checked =
                this.params.appSettings.requireHoldToSend;

            // Add change listener
            holdToSendToggle.addEventListener('change', () => {
                this.params.appSettings.requireHoldToSend =
                    holdToSendToggle.checked;
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
        }

        // Setup primary balance toggle and apply saved setting
        const primaryBalanceToggle = document.getElementById(
            'primary-balance-toggle',
        ) as HTMLInputElement;
        if (primaryBalanceToggle) {
            // Apply saved setting to toggle UI
            // Toggle is checked when primary balance is Fiat
            primaryBalanceToggle.checked =
                this.params.appSettings.primaryBalanceType !== 'XEC';

            // Add change listener
            primaryBalanceToggle.addEventListener('change', async () => {
                this.params.appSettings.primaryBalanceType =
                    primaryBalanceToggle.checked ? 'Fiat' : 'XEC';
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
        }
        // Setup settings back button
        const settingsBackBtn = document.getElementById('settings-back-btn');
        if (settingsBackBtn) {
            settingsBackBtn.addEventListener('click', () => {
                this.params.navigation.showScreen(Screen.Main);
            });
        }

        // Setup mnemonic edit buttons
        const editMnemonicBtn = document.getElementById('edit-mnemonic-btn');
        if (editMnemonicBtn) {
            editMnemonicBtn.addEventListener('click', () => {
                this.showMnemonicEditModal();
            });
        }

        const cancelMnemonicEditBtn = document.getElementById(
            'cancel-mnemonic-edit',
        );
        if (cancelMnemonicEditBtn) {
            cancelMnemonicEditBtn.addEventListener('click', () => {
                this.hideMnemonicEditModal();
                this.hideValidationMessage();
            });
        }

        const closeMnemonicModalBtn = document.getElementById(
            'close-mnemonic-modal',
        );
        if (closeMnemonicModalBtn) {
            closeMnemonicModalBtn.addEventListener('click', () => {
                this.hideMnemonicEditModal();
                this.hideValidationMessage();
            });
        }

        const saveMnemonicEditBtn =
            document.getElementById('save-mnemonic-edit');
        if (saveMnemonicEditBtn) {
            saveMnemonicEditBtn.addEventListener('click', async () => {
                const editText = document.getElementById(
                    'mnemonic-edit-text',
                ) as HTMLTextAreaElement;
                if (editText) {
                    await this.saveMnemonic(editText.value.trim());
                }
            });
        }

        this.updateMnemonicDisplay();
    }

    // Mnemonic management functions
    private updateMnemonicDisplay(): void {
        const mnemonicText = document.getElementById(
            'mnemonic-text',
        ) as HTMLTextAreaElement;
        const walletMnemonic = getMnemonic(this.params.wallet);
        if (mnemonicText && walletMnemonic) {
            mnemonicText.value = walletMnemonic;
        }
    }

    private showMnemonicEditModal(): void {
        const modal = document.getElementById('mnemonic-edit-modal');
        if (modal) {
            const editText = document.getElementById(
                'mnemonic-edit-text',
            ) as HTMLTextAreaElement;
            const validation = document.getElementById('mnemonic-validation');

            if (editText) {
                const walletMnemonic = getMnemonic(this.params.wallet);
                editText.value = walletMnemonic ? walletMnemonic : '';
            }

            if (validation) {
                validation.style.display = 'none';
            }

            modal.style.display = 'flex';
            modal.classList.remove('hidden');
        }
    }

    private hideMnemonicEditModal(): void {
        const modal = document.getElementById('mnemonic-edit-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    }

    private showValidationMessage(
        message: string,
        isError: boolean = true,
    ): void {
        const validation = document.getElementById('mnemonic-validation');
        if (validation) {
            validation.textContent = message;
            validation.className = `validation-message ${
                isError ? 'error' : 'success'
            }`;
            validation.style.display = 'block';
        }
    }

    private hideValidationMessage(): void {
        const validation = document.getElementById('mnemonic-validation');
        if (validation) {
            validation.style.display = 'none';
        }
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
            const saveMnemonicEditBtn = document.getElementById(
                'save-mnemonic-edit',
            ) as HTMLButtonElement;
            if (saveMnemonicEditBtn) {
                saveMnemonicEditBtn.disabled = true;
            }

            // Hide modal after a short delay
            setTimeout(() => {
                this.hideMnemonicEditModal();
                this.hideValidationMessage();
                // Re-enable the save button
                if (saveMnemonicEditBtn) {
                    saveMnemonicEditBtn.disabled = false;
                }
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
