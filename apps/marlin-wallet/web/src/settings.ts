// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewLog, webViewError } from './common';
import { Fiat } from 'ecash-price';

// ============================================================================
// SETTINGS INTERFACE AND PERSISTENCE
// ============================================================================

// Only used for settings that don't require any security or encryption
const SETTINGS_STORAGE_KEY = 'ecashwallet.settings.1';

// Internal storage format (for JSON serialization)
interface StoredSettings {
    requireHoldToSend: boolean;
    primaryBalanceType: 'XEC' | 'Fiat';
    fiatCurrency: string;
}

// Public interface with Fiat object
export interface AppSettings {
    requireHoldToSend: boolean;
    primaryBalanceType: 'XEC' | 'Fiat';
    fiatCurrency: Fiat;
}

// Load settings from localStorage
export function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
            const storedSettings = JSON.parse(stored) as StoredSettings;
            return {
                requireHoldToSend: storedSettings.requireHoldToSend,
                primaryBalanceType: storedSettings.primaryBalanceType,
                fiatCurrency: new Fiat(storedSettings.fiatCurrency),
            };
        }
    } catch (error) {
        webViewError('Failed to load settings from localStorage:', error);
    }

    // Return defaults if no settings found
    return {
        requireHoldToSend: true,
        primaryBalanceType: 'XEC',
        fiatCurrency: Fiat.USD,
    };
}

// Save settings to localStorage
export function saveSettings(appSettings: AppSettings): void {
    try {
        const storedSettings: StoredSettings = {
            requireHoldToSend: appSettings.requireHoldToSend,
            primaryBalanceType: appSettings.primaryBalanceType,
            fiatCurrency: appSettings.fiatCurrency.toString(),
        };
        localStorage.setItem(
            SETTINGS_STORAGE_KEY,
            JSON.stringify(storedSettings),
        );
        webViewLog('Settings saved to localStorage');
    } catch (error) {
        webViewError('Failed to save settings to localStorage:', error);
    }
}
