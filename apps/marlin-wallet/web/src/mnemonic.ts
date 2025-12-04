// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as bip39 from 'bip39';
import randomBytes from 'randombytes';
import {
    isReactNativeWebView,
    sendMessageToBackend,
    webViewLog,
    webViewError,
} from './common';
import { WalletData } from './wallet';

/**
 * Generate a mnemonic using the bip39 library. Use to create a new wallet.
 */
export function generateMnemonic(): string {
    const mnemonic = bip39.generateMnemonic(
        128,
        randomBytes,
        bip39.wordlists['english'],
    );
    return mnemonic;
}

/*
 * Get the mnemonic from the wallet data object.
 * TODO: Switch to be a proper HD wallet. This means that the seed should be
 * stored in ecash-wallet and then we can retrieve the mnemonic from there.
 */
export function getMnemonic(walletData: WalletData): string | null {
    if (!walletData || !walletData.mnemonic) {
        return null;
    }
    return walletData.mnemonic;
}

// Check the mnemonic is valid
export function validateMnemonic(mnemonic: string): boolean {
    try {
        // Check if it's a valid BIP39 mnemonic
        return bip39.validateMnemonic(mnemonic.trim());
    } catch {
        return false;
    }
}

/**
 * Request to store mnemonic in secure storage, fallback to localStorage for
 * web.
 */
export function storeMnemonic(mnemonic: string): void {
    if (!sendMessageToBackend('STORE_MNEMONIC', mnemonic)) {
        // Fallback to localStorage for web
        localStorage.setItem('ecash_wallet_mnemonic', mnemonic);
    }
}

/**
 * Request to load mnemonic from secure storage, fallback to localStorage for
 * web.
 */
export function loadMnemonic(): Promise<string | null> {
    return new Promise((resolve, reject) => {
        if (isReactNativeWebView()) {
            webViewLog('Loading mnemonic from secure storage');
            const handleResponse = (event: MessageEvent) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'MNEMONIC_RESPONSE') {
                        document.removeEventListener('message', handleResponse);
                        window.removeEventListener('message', handleResponse);
                        resolve(message.data);
                    }
                } catch (error) {
                    webViewError('Error parsing mnemonic response:', error);
                }
            };

            document.addEventListener('message', handleResponse);
            window.addEventListener('message', handleResponse);

            sendMessageToBackend('LOAD_MNEMONIC', undefined);

            // Timeout after 30 seconds
            setTimeout(() => {
                document.removeEventListener('message', handleResponse);
                window.removeEventListener('message', handleResponse);
                reject(new Error('Timeout loading mnemonic'));
            }, 30000);
        } else {
            webViewLog('Loading mnemonic from local storage');
            // Fallback to localStorage for web
            const mnemonic = localStorage.getItem('ecash_wallet_mnemonic');
            resolve(mnemonic);
        }
    });
}
