// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    normalizeBalanceText,
    openSettingsFromMain,
    selectFirmaAsset,
    visitFresh,
    waitForMainLoaded,
    FIRMA_FORMATTED_TICKER,
} from '../fixture/common';
import { stubCoingeckoXecFiatPrices } from '../fixture/stubs';

describe('Main screen', () => {
    const returnToMainFromSettings = () => {
        cy.get('#settings-back-btn').click();
        cy.get('#main-screen').should('be.visible');
    };

    beforeEach(() => {
        stubCoingeckoXecFiatPrices();
    });

    it('shows then hides the loading overlay during startup', () => {
        visitFresh();

        // Overlay is shown after i18n init with loading.authenticationRequired
        // We can safely assume the default locale is used in this test
        // (en.json) since the local storage is cleared before the test.
        cy.get('#loading').should('be.visible');
        cy.get('#loading .loading-text').should(
            'contain',
            'Authentication required',
        );
        cy.get('#loading .loading-spinner').should('exist');

        cy.get('#loading').should('not.be.visible');
        cy.get('#main-screen').should('be.visible');
    });

    it('displays zero XEC primary balance and USD secondary balance', () => {
        visitFresh();

        waitForMainLoaded();

        // Default settings: primary XEC, fiat USD (en locale)
        cy.get('#primary-balance')
            .should('be.visible')
            .invoke('text')
            .then(t => t.trim())
            .should('eq', '0.00 XEC');

        cy.get('#secondary-balance')
            .should('be.visible')
            .invoke('text')
            .then(t => t.trim())
            .should('eq', '$0.00');
    });

    it('inverts balance ordering when fiat is the primary balance', () => {
        visitFresh();
        waitForMainLoaded();

        cy.get('#primary-balance')
            .invoke('text')
            .then(t => t.trim())
            .should('eq', '0.00 XEC');
        cy.get('#secondary-balance')
            .invoke('text')
            .then(t => t.trim())
            .should('eq', '$0.00');

        openSettingsFromMain();
        cy.get('#primary-balance-toggle').should('not.be.checked');
        // Input is purposely visually hidden (0×0); the slider is the visible
        // control (see src/main.css .toggle-switch input).
        // We force the check to avoid cypress from failing due to the input
        // being hidden.
        cy.get('#primary-balance-toggle').check({ force: true });
        cy.get('#primary-balance-toggle').should('be.checked');

        returnToMainFromSettings();

        // primaryBalanceType === 'Fiat': primary is fiat, secondary is XEC
        cy.get('#primary-balance')
            .should('be.visible')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '$0.00');
        cy.get('#secondary-balance')
            .should('be.visible')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '0.00 XEC');

        openSettingsFromMain();
        // Input is purposely visually hidden (0×0); the slider is the visible
        // control (see src/main.css .toggle-switch input).
        // We force the check to avoid cypress from failing due to the input
        // being hidden.
        cy.get('#primary-balance-toggle').uncheck({ force: true });
        cy.get('#primary-balance-toggle').should('not.be.checked');

        returnToMainFromSettings();

        cy.get('#primary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '0.00 XEC');
        cy.get('#secondary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '$0.00');
    });

    it('updates balance display when locale then fiat currency change', () => {
        visitFresh();
        waitForMainLoaded();

        cy.get('#primary-balance')
            .invoke('text')
            .then(t => t.trim())
            .should('eq', '0.00 XEC');
        cy.get('#secondary-balance')
            .invoke('text')
            .then(t => t.trim())
            .should('eq', '$0.00');

        openSettingsFromMain();
        cy.get('#language-select').select('de');
        cy.get('#settings-screen h2').should('contain', 'Einstellungen');

        returnToMainFromSettings();

        cy.get('#primary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '0,00 XEC');
        cy.get('#secondary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '0,00 $');

        openSettingsFromMain();
        cy.get('#fiat-currency-select').select('eur');
        cy.get('#fiat-currency-select').should('have.value', 'eur');

        returnToMainFromSettings();

        cy.get('#primary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '0,00 XEC');
        cy.get('#secondary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '0,00 €');
    });

    it('displays wallet receiving address and QR code', () => {
        visitFresh();

        cy.get('#loading').should('not.be.visible');
        cy.get('#address')
            .should('be.visible')
            .invoke('text')
            .then(text => text.trim())
            .should('match', /^ecash:[a-z0-9]+$/i);

        cy.get('#qr-code canvas').should($canvasList => {
            expect($canvasList).to.have.length(1);
            const el = $canvasList.get(0) as HTMLCanvasElement;
            expect(el.width).to.be.greaterThan(0);
            expect(el.height).to.be.greaterThan(0);
        });

        cy.get('#qr-code').should('not.contain', 'QR Code generation failed');
    });

    it('switches primary balance unit between XEC and Firma (zero balance)', () => {
        visitFresh();
        waitForMainLoaded();

        cy.get('#primary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '0.00 XEC');

        selectFirmaAsset();

        cy.get('#primary-balance').should($el => {
            expect(normalizeBalanceText($el.text())).to.equal(
                `0.0000 ${FIRMA_FORMATTED_TICKER}`,
            );
        });

        cy.get('#asset-picker-btn').click();
        cy.get('#asset-picker-menu').should('have.class', 'open');
        cy.get('#asset-picker-menu [data-asset="xec"]').click();
        cy.get('#asset-picker-menu').should('not.have.class', 'open');

        cy.get('#primary-balance').should($el => {
            expect(normalizeBalanceText($el.text())).to.equal('0.00 XEC');
        });
    });

    it('inverts primary and secondary balances with Firma selected (crypto vs fiat)', () => {
        visitFresh();
        waitForMainLoaded();

        selectFirmaAsset();

        cy.get('#primary-balance').should($el => {
            expect(normalizeBalanceText($el.text())).to.equal(
                `0.0000 ${FIRMA_FORMATTED_TICKER}`,
            );
        });
        cy.get('#secondary-balance').should($el => {
            expect(normalizeBalanceText($el.text())).to.equal('$0.00');
        });

        openSettingsFromMain();
        cy.get('#primary-balance-toggle').should('not.be.checked');
        cy.get('#primary-balance-toggle').check({ force: true });
        cy.get('#primary-balance-toggle').should('be.checked');

        returnToMainFromSettings();

        cy.get('#primary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '$0.00');
        cy.get('#secondary-balance')
            .should('be.visible')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', `0.0000 ${FIRMA_FORMATTED_TICKER}`);

        openSettingsFromMain();
        cy.get('#primary-balance-toggle').uncheck({ force: true });
        cy.get('#primary-balance-toggle').should('not.be.checked');

        returnToMainFromSettings();

        cy.get('#primary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', `0.0000 ${FIRMA_FORMATTED_TICKER}`);
        cy.get('#secondary-balance')
            .invoke('text')
            .then(t => normalizeBalanceText(t))
            .should('eq', '$0.00');
    });
});
