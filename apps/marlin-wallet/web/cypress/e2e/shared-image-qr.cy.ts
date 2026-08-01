// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { visitWithWalletMnemonic, waitForMainLoaded } from '../fixture/common';
import { runWithChronik, stubCoingeckoXecFiatPrices } from '../fixture/stubs';
import { createBip21Uri } from '../../src/bip21';

/** Matches `cypress/fixture/chronik/qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2.json`. */
const TEST_MNEMONIC =
    'load quality private purchase cream pony powder stairs edit fashion until earn';

const CHRONIK_STUB = 'qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2.json';

/** 1×1 PNG — no QR payload (decode → null → error modal). */
const TINY_PNG_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/**
 * Simulates Android MainActivity forwarding a share-intent result into the
 * WebView (`index.ts` listens on `window` + `document` for `message`).
 */
function postNativeBridgeMessage(payload: {
    type: string;
    data?: string;
}): void {
    cy.window().then(win => {
        win.postMessage(JSON.stringify(payload), '*');
    });
}

function assertShareImageErrorModal(): void {
    cy.get('#error-modal-overlay').should('be.visible');
    cy.get('#error-modal-title').should('contain', 'No valid QR code');
    cy.get('#error-modal-message').should(
        'contain',
        'Failed to decode a valid QR code from the image',
    );
}

describe('Shared image QR (native bridge)', () => {
    beforeEach(() => {
        stubCoingeckoXecFiatPrices();
    });

    it('shows error modal for SHARED_IMAGE_READ_FAILED', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, {
                requireHoldToSend: false,
            });
            waitForMainLoaded();

            postNativeBridgeMessage({ type: 'SHARED_IMAGE_READ_FAILED' });

            assertShareImageErrorModal();
            cy.get('#error-modal-close').click();
            cy.get('#error-modal-overlay').should('not.be.visible');
        });
    });

    it('shows error modal when image has no decodable QR', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, {
                requireHoldToSend: false,
            });
            waitForMainLoaded();

            postNativeBridgeMessage({
                type: 'DECODE_QR_FROM_SHARED_IMAGE',
                data: TINY_PNG_DATA_URL,
            });

            assertShareImageErrorModal();
            cy.get('#error-modal-close').click();
            cy.get('#error-modal-overlay').should('not.be.visible');
        });
    });

    it('opens send screen when shared image decodes to ecash URI', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, {
                requireHoldToSend: false,
            });
            waitForMainLoaded();

            cy.readFile(
                'cypress/fixture/qr/qr-ecash-address.png',
                'base64',
            ).then(b64 => {
                const dataUrl = `data:image/png;base64,${b64}`;
                postNativeBridgeMessage({
                    type: 'DECODE_QR_FROM_SHARED_IMAGE',
                    data: dataUrl,
                });
            });

            cy.get('#send-screen').should('not.have.class', 'hidden');
            cy.get('#recipient-address').should(
                'contain.value',
                'ecash:qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2',
            );
        });
    });

    it('opens send screen with amount when shared image decodes to XEC BIP21 payment', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, {
                requireHoldToSend: false,
            });
            waitForMainLoaded();

            const bip21PaymentRecipient =
                'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g';
            expect(createBip21Uri(bip21PaymentRecipient, 1000)).to.equal(
                'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g?amount=10.00',
            );

            cy.readFile(
                'cypress/fixture/qr/qr-xec-bip21-payment.png',
                'base64',
            ).then(b64 => {
                const dataUrl = `data:image/png;base64,${b64}`;
                postNativeBridgeMessage({
                    type: 'DECODE_QR_FROM_SHARED_IMAGE',
                    data: dataUrl,
                });
            });

            cy.get('#send-screen').should('not.have.class', 'hidden');
            cy.get('#recipient-address').should(
                'have.value',
                bip21PaymentRecipient,
            );
            cy.get('#send-amount').should('have.value', '10.00');
            cy.get('#send-amount').should('have.attr', 'readonly', 'readonly');
        });
    });

    it('opens send screen with Firma amount when shared image decodes to Firma BIP21 payment', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, {
                requireHoldToSend: false,
            });
            waitForMainLoaded();

            const firmaPaymentRecipient =
                'ecash:qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g';
            const firmaPaymentQty = '0.3000';

            cy.readFile(
                'cypress/fixture/qr/qr-firma-bip21-payment.png',
                'base64',
            ).then(b64 => {
                const dataUrl = `data:image/png;base64,${b64}`;
                postNativeBridgeMessage({
                    type: 'DECODE_QR_FROM_SHARED_IMAGE',
                    data: dataUrl,
                });
            });

            cy.get('#send-screen').should('not.have.class', 'hidden');
            cy.get('#ticker-label').should('contain', 'FIRMA');
            cy.get('#recipient-address').should(
                'have.value',
                firmaPaymentRecipient,
            );
            cy.get('#send-amount').should('have.value', firmaPaymentQty);
            cy.get('#send-amount').should('have.attr', 'readonly', 'readonly');
        });
    });
});
