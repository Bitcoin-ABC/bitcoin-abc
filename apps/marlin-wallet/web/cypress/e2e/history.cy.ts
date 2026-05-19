// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    normalizeBalanceText,
    openSettingsFromMain,
    selectFirmaAsset,
    visitWithWalletMnemonic,
    waitForMainLoaded,
} from '../fixture/common';
import type { ChronikStub } from '../fixture/chronik-json-protobuf';
import { runWithChronik, stubCoingeckoXecFiatPrices } from '../fixture/stubs';
import { VISIBLE_BATCH_TARGET } from '../../src/transaction-history';

/** Same mnemonic as mnemonic.cy.ts / cashtab vectors; matches Chronik stubs. */
const TEST_MNEMONIC =
    'beauty shoe decline spend still weird slot snack coach flee between paper';
const CHRONIK_STUB = 'qqa9lv3kjd8vq7952p7rq0f6lkpqvlu0cydvxtd70g.json';

/** Matches `cypress/fixture/chronik/qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2.json`. */
const FIRMA_WALLET_MNEMONIC =
    'load quality private purchase cream pony powder stairs edit fashion until earn';
const CHRONIK_STUB_FIRMA_WALLET =
    'qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2.json';
/** Page 0 is XEC-only; Firma txs start on page 1 with a single tx. */
const CHRONIK_STUB_FIRMA_BURIED =
    'qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2-firma-buried.json';
/** Page 0 is XEC-only; 25 Firma txs on page 1, 10 more on page 2. */
const CHRONIK_STUB_FIRMA_PAGINATED =
    'qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2-firma-paginated.json';

function openHistoryFromMain(): void {
    cy.get('#main-screen').should('be.visible');
    cy.get('.history-button').click();
    cy.get('#history-screen').should('be.visible');
}

function chronikStubPageTxCount(stub: ChronikStub, page: number): number {
    if (page + 1 < stub.meta.historyNumPages) {
        return stub.meta.pageSize;
    }
    return stub.meta.historyNumTxs % stub.meta.pageSize;
}

describe('Transaction history', () => {
    beforeEach(() => {
        stubCoingeckoXecFiatPrices();
    });

    it('shows a no-transactions message when history is empty', () => {
        runWithChronik('empty.json', () => {
            visitWithWalletMnemonic(TEST_MNEMONIC);
            waitForMainLoaded();
            openHistoryFromMain();

            cy.get('#transaction-list .no-transactions h3').should(
                'contain',
                'No Transactions',
            );
            cy.get('#transaction-list .no-transactions p').should(
                'contain',
                "You haven't made any transactions yet.",
            );
        });
    });

    it('returns to the main screen from transaction history', () => {
        runWithChronik('empty.json', () => {
            visitWithWalletMnemonic(TEST_MNEMONIC);
            waitForMainLoaded();
            openHistoryFromMain();

            cy.get('#history-back-btn').click();
            cy.get('#main-screen').should('be.visible');
            cy.get('#history-screen').should('not.be.visible');
        });
    });

    it('shows a short list with correct primary (XEC) and secondary (USD) amounts', () => {
        runWithChronik(CHRONIK_STUB, ({ stub }) => {
            visitWithWalletMnemonic(TEST_MNEMONIC);
            waitForMainLoaded();
            openHistoryFromMain();

            cy.get('#transaction-list .transaction-item').should(
                'have.length',
                chronikStubPageTxCount(stub, 0),
            );

            // Anti-chronological order: first row is the send (-12.96 XEC), second
            // is the receive (+7.50 XEC) for the stubbed Cashtab test wallet.
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-12.96 XEC',
                    );
                });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-$0.000648',
                    );
                });

            cy.get('#transaction-list .transaction-item')
                .eq(1)
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq('+7.50 XEC');
                });
            cy.get('#transaction-list .transaction-item')
                .eq(1)
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '+$0.000375',
                    );
                });
        });
    });

    it('updates fiat and locale formatting in transaction history', () => {
        runWithChronik(CHRONIK_STUB, ({ stub }) => {
            visitWithWalletMnemonic(TEST_MNEMONIC);
            waitForMainLoaded();
            openHistoryFromMain();

            cy.get('#transaction-list .transaction-item').should(
                'have.length',
                chronikStubPageTxCount(stub, 0),
            );

            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-12.96 XEC',
                    );
                });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-$0.000648',
                    );
                });

            cy.get('#history-back-btn').click();
            cy.get('#main-screen').should('be.visible');

            openSettingsFromMain();
            cy.get('#language-select').select('de');
            cy.get('#settings-screen h2').should('contain', 'Einstellungen');
            cy.get('#settings-back-btn').click();
            cy.get('#main-screen').should('be.visible');

            openHistoryFromMain();

            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-12,96 XEC',
                    );
                });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-0,000648 $',
                    );
                });

            cy.get('#history-back-btn').click();
            cy.get('#main-screen').should('be.visible');

            openSettingsFromMain();
            cy.get('#fiat-currency-select').select('eur');
            cy.get('#fiat-currency-select').should('have.value', 'eur');
            cy.get('#settings-back-btn').click();
            cy.get('#main-screen').should('be.visible');

            openHistoryFromMain();

            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-12,96 XEC',
                    );
                });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-0,00059616 €',
                    );
                });

            cy.get('#transaction-list .transaction-item')
                .eq(1)
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq('+7,50 XEC');
                });
            cy.get('#transaction-list .transaction-item')
                .eq(1)
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '+0,000345 €',
                    );
                });
        });
    });

    it('shows Firma amounts in history when Firma is selected', () => {
        runWithChronik(CHRONIK_STUB_FIRMA_WALLET, () => {
            visitWithWalletMnemonic(FIRMA_WALLET_MNEMONIC);
            waitForMainLoaded();

            selectFirmaAsset();

            cy.get('#primary-balance').should($el => {
                expect(normalizeBalanceText($el.text())).to.eq('0.5000 FIRMA');
            });

            openHistoryFromMain();

            cy.get('#transaction-list').should($el => {
                expect($el.html()).to.not.include('loading-transactions');
            });

            // Stub has two XEC txs but only one Firma token movement for this wallet.
            cy.get('#transaction-list .transaction-item').should(
                'have.length',
                1,
            );
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '+0.5000 FIRMA',
                    );
                });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq('+$0.50');
                });
        });
    });

    it('inverts Firma vs fiat amount columns in history when fiat is primary', () => {
        runWithChronik(CHRONIK_STUB_FIRMA_WALLET, () => {
            visitWithWalletMnemonic(FIRMA_WALLET_MNEMONIC);
            waitForMainLoaded();

            selectFirmaAsset();

            cy.get('#primary-balance').should($el => {
                expect(normalizeBalanceText($el.text())).to.eq('0.5000 FIRMA');
            });

            openHistoryFromMain();

            cy.get('#transaction-list').should($el => {
                expect($el.html()).to.not.include('loading-transactions');
            });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '+0.5000 FIRMA',
                    );
                });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq('+$0.50');
                });

            cy.get('#history-back-btn').click();
            cy.get('#main-screen').should('be.visible');

            openSettingsFromMain();
            cy.get('#primary-balance-toggle').check({ force: true });
            cy.get('#primary-balance-toggle').should('be.checked');
            cy.get('#settings-back-btn').click();
            cy.get('#main-screen').should('be.visible');

            openHistoryFromMain();

            cy.get('#transaction-list').should($el => {
                expect($el.html()).to.not.include('loading-transactions');
            });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq('+$0.50');
                });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '+0.5000 FIRMA',
                    );
                });
        });
    });

    it('inverts primary and secondary amounts when fiat is the primary balance', () => {
        runWithChronik(CHRONIK_STUB, ({ stub }) => {
            visitWithWalletMnemonic(TEST_MNEMONIC);
            waitForMainLoaded();
            openHistoryFromMain();

            cy.get('#transaction-list .transaction-item').should(
                'have.length',
                chronikStubPageTxCount(stub, 0),
            );

            cy.get('#history-back-btn').click();
            cy.get('#main-screen').should('be.visible');

            openSettingsFromMain();
            cy.get('#primary-balance-toggle').check({ force: true });
            cy.get('#primary-balance-toggle').should('be.checked');
            cy.get('#settings-back-btn').click();
            cy.get('#main-screen').should('be.visible');

            openHistoryFromMain();

            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-$0.000648',
                    );
                });
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-secondary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '-12.96 XEC',
                    );
                });
        });
    });

    it('shows Firma history when Firma txs are buried after XEC-only pages', () => {
        runWithChronik(CHRONIK_STUB_FIRMA_BURIED, ({ stub }) => {
            expect(stub.meta.historyNumPages).to.be.greaterThan(1);

            visitWithWalletMnemonic(FIRMA_WALLET_MNEMONIC);
            waitForMainLoaded();
            selectFirmaAsset();
            openHistoryFromMain();

            cy.get('#transaction-list').should($el => {
                expect($el.html()).to.not.include('loading-transactions');
            });
            cy.get('#transaction-list .no-transactions').should('not.exist');
            cy.get('#transaction-list .transaction-item').should(
                'have.length',
                1,
            );
            cy.get('#transaction-list .transaction-item')
                .first()
                .find('.transaction-amount-primary')
                .should($el => {
                    expect(normalizeBalanceText($el.text())).to.eq(
                        '+0.5000 FIRMA',
                    );
                });
        });
    });

    it('loads more Firma transactions when scrolling after multi-page fetch', () => {
        runWithChronik(CHRONIK_STUB_FIRMA_PAGINATED, ({ stub }) => {
            expect(stub.meta.historyNumPages).to.equal(3);

            visitWithWalletMnemonic(FIRMA_WALLET_MNEMONIC);
            waitForMainLoaded();
            selectFirmaAsset();
            openHistoryFromMain();

            cy.get('#transaction-list .transaction-item').should(
                'have.length',
                VISIBLE_BATCH_TARGET,
            );

            cy.get('#transaction-list').invoke(
                'attr',
                'style',
                'max-height: 140px !important; overflow-y: auto !important;',
            );
            cy.get('#transaction-list').scrollTo('bottom', {
                ensureScrollable: false,
            });

            cy.get('#transaction-list .transaction-item').should(
                'have.length',
                VISIBLE_BATCH_TARGET + 10,
            );
        });
    });

    it('loads more transactions when scrolling to the bottom of the list', () => {
        runWithChronik(CHRONIK_STUB, ({ stub }) => {
            expect(stub.meta.historyNumPages).to.be.greaterThan(1);

            visitWithWalletMnemonic(TEST_MNEMONIC);
            waitForMainLoaded();
            openHistoryFromMain();

            cy.get('#transaction-list .transaction-item').should(
                'have.length',
                chronikStubPageTxCount(stub, 0),
            );

            // Many rows fit the default viewport; force a small scroll container so
            // scrollTo fires and infinite scroll loads the next Chronik page.
            cy.get('#transaction-list').invoke(
                'attr',
                'style',
                'max-height: 140px !important; overflow-y: auto !important;',
            );
            cy.get('#transaction-list').scrollTo('bottom', {
                ensureScrollable: false,
            });

            cy.get('#transaction-list .transaction-item').should(
                'have.length',
                chronikStubPageTxCount(stub, 0) +
                    chronikStubPageTxCount(stub, 1),
            );
        });
    });
});
