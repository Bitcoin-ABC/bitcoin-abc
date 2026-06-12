// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/// <reference types="cypress" />

import { DEFAULT_LOCALE } from '../../../i18n/locales';
import {
    CryptoTicker,
    formatPrice,
    type PriceFormatterConfig,
} from 'ecash-price';
import { FIRMA_TOKEN } from '../../src/supported-assets';

/** Ticker shown in formatted Firma crypto amounts (preserves display casing). */
export const FIRMA_FORMATTED_TICKER = FIRMA_TOKEN.ticker;

export function formatFirmaAmount(
    amount: number,
    config?: PriceFormatterConfig,
): string {
    const cryptoTicker = new CryptoTicker(FIRMA_TOKEN.ticker.toLowerCase());
    const formatted = formatPrice(amount, cryptoTicker, {
        locale: DEFAULT_LOCALE,
        decimals: FIRMA_TOKEN.decimals,
        ...config,
    });
    const upperSuffix = ` ${cryptoTicker.toString().toUpperCase()}`;
    const displaySuffix = ` ${FIRMA_TOKEN.ticker}`;
    if (formatted.endsWith(upperSuffix)) {
        return formatted.slice(0, -upperSuffix.length) + displaySuffix;
    }
    return formatted;
}

/**
 * Partial overrides for `ecashwallet.settings.1` (stored JSON in
 * `src/settings.ts`). Omitted keys use the same defaults as `loadSettings()`
 * there when no saved settings exist.
 */
export type VisitWalletMnemonicSettings = {
    requireHoldToSend?: boolean;
    primaryBalanceType?: 'XEC' | 'Fiat';
    /** Fiat code string, e.g. `USD` (as persisted by `saveSettings`). */
    fiatCurrency?: string;
    locale?: string;
};

/** Optional hooks for {@link visitWithWalletMnemonic}. */
export type VisitWalletMnemonicHooks = {
    /**
     * Runs at the end of `onBeforeLoad` (after `localStorage` is seeded),
     * before the application JavaScript executes.
     */
    beforeAppLoad?: (win: Cypress.AUTWindow) => void;
};

const DEFAULT_STORED_WALLET_SETTINGS = {
    requireHoldToSend: true,
    primaryBalanceType: 'XEC' as const,
    fiatCurrency: 'USD',
    locale: DEFAULT_LOCALE,
};

/**
 * Visit the app root with cleared localStorage so each test starts from defaults.
 */
export function visitFresh(): void {
    cy.visit('/', {
        onBeforeLoad(win) {
            win.localStorage.clear();
        },
    });
}

/**
 * Visit the app with a fixed mnemonic pre-seeded (`ecash_wallet_mnemonic`).
 * Use with Chronik stubs that target the same wallet.
 *
 * If `settings` is omitted, `ecashwallet.settings.1` is not written and the app
 * uses `loadSettings()` defaults from `src/settings.ts`. If `settings` is
 * passed, each field falls back to those same defaults when not specified, then
 * the merged object is stored before load.
 *
 * Optional `hooks.beforeAppLoad` runs last in `onBeforeLoad` (e.g. install a
 * stub `WebSocket` before the bundle runs).
 */
export function visitWithWalletMnemonic(
    mnemonic: string,
    settings?: VisitWalletMnemonicSettings,
    hooks?: VisitWalletMnemonicHooks,
): void {
    cy.visit('/', {
        onBeforeLoad(win) {
            win.localStorage.clear();
            win.localStorage.setItem('ecash_wallet_mnemonic', mnemonic);
            if (settings !== undefined) {
                win.localStorage.setItem(
                    'ecashwallet.settings.1',
                    JSON.stringify({
                        ...DEFAULT_STORED_WALLET_SETTINGS,
                        ...settings,
                    }),
                );
            }
            hooks?.beforeAppLoad?.(win);
        },
    });
}

/**
 * Assert the startup loading overlay is gone and the main screen is visible.
 */
export function waitForMainLoaded(): void {
    cy.get('#loading').should('not.be.visible');
    cy.get('#main-screen').should('be.visible');
}

/**
 * Select the Firma asset from the main screen asset picker (closes the menu).
 */
export function selectFirmaAsset(): void {
    cy.get('#asset-picker-btn').click();
    cy.get('#asset-picker-menu').should('have.class', 'open');
    cy.get('#asset-picker-menu [data-asset="firma"]').click();
    cy.get('#asset-picker-menu').should('not.have.class', 'open');
}

/**
 * Normalize balance / fiat strings from the DOM for assertions (NBSP → space,
 * trim).
 */
export function normalizeBalanceText(s: string): string {
    return s.replace(/\u00a0/g, ' ').trim();
}

/**
 * Open the settings screen from the main wallet view.
 */
export function openSettingsFromMain(): void {
    cy.get('#main-screen').should('be.visible');
    cy.get('.settings-button').click();
    cy.get('#settings-screen').should('be.visible');
}
