// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { webViewLog, webViewError } from './common';

// ============================================================================
// SETTINGS INTERFACE AND PERSISTENCE
// ============================================================================

// Only used for settings that don't require any security or encryption
const SETTINGS_STORAGE_KEY = 'ecashwallet.settings.1';

export interface AppSettings {
    requireHoldToSend: boolean;
    primaryBalanceType: 'XEC' | 'Fiat';
}

// Load settings from localStorage
export function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
            const settings = JSON.parse(stored) as AppSettings;
            return settings;
        }
    } catch (error) {
        webViewError('Failed to load settings from localStorage:', error);
    }

    // Return defaults if no settings found
    return {
        requireHoldToSend: true,
        primaryBalanceType: 'XEC',
    };
}

// Save settings to localStorage
export function saveSettings(appSettings: AppSettings): void {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
        webViewLog('Settings saved to localStorage');
    } catch (error) {
        webViewError('Failed to save settings to localStorage:', error);
    }
}
