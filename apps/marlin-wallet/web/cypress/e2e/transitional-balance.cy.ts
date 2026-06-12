// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    TxFinalizationReasonType,
    TxMsgType,
} from '../../../../../modules/chronik-client/proto/chronik';
import { fromHexRev } from '../../../../../modules/chronik-client/src/hex';
import { CryptoTicker, Fiat, formatPrice } from 'ecash-price';

import { DEFAULT_LOCALE } from '../../../i18n/locales';
import { atomsToUnit, unitToAtoms } from '../../src/amount';
import { FIRMA_TOKEN, XEC_ASSET } from '../../src/supported-assets';
import {
    normalizeBalanceText,
    openSettingsFromMain,
    selectFirmaAsset,
    visitWithWalletMnemonic,
    waitForMainLoaded,
    formatFirmaAmount,
} from '../fixture/common';
import {
    installChronikWebSocketStub,
    runWithChronik,
    stubCoingeckoXecFiatPrices,
    type ChronikWebSocketStub,
    type WindowWithChronikWebSocketStub,
} from '../fixture/stubs';

/** Same mnemonic as `qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2.json`. */
const TEST_MNEMONIC =
    'load quality private purchase cream pony powder stairs edit fashion until earn';
const CHRONIK_STUB = 'qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2.json';
/**
 * Final spendable XEC from `qzrfaekxtl75...json` for this mnemonic
 * (10_000_000 sats).
 */
const STUB_AVAILABLE_XEC = 100_000;
/** Firma token atoms available from `qzrfaek...json` (final UTXO) before synthetic receives. */
const STUB_AVAILABLE_FIRMA_ATOMS = 5_000;
/** output script for `ecash:qzrfaekxtl75jsgf30evmnzh9esjmx5wzu0vnzdxy2` */
const STUB_WALLET_OUTPUT_SCRIPT = 'dqkUhp7mxl/9SUEJi/LNzFcuYS2ajheIrA==';
/** USD per 1 XEC from {@link stubCoingeckoXecFiatPrices} (`ecash.usd`). */
const STUB_USD_PER_XEC = 0.00005;

/** External p2pkh script used on the synthetic input (not the stub wallet). */
const SYNTHETIC_P2PKH_OUTPUT_SCRIPT = 'dqkUfsiUhjvs0GZXr1GsRXF/erkXfeSIrA==';
const SYNTHETIC_INPUT_SATS = 5_000_000;
const SYNTHETIC_FEE_SATS = 1000;

function uint8ToBase64(u8: Uint8Array): string {
    let bin = '';
    for (let i = 0; i < u8.length; i++) {
        bin += String.fromCharCode(u8[i]!);
    }
    return btoa(bin);
}

function receiveTx(txid: string, amountSats: number): Record<string, unknown> {
    return {
        txid: uint8ToBase64(fromHexRev(txid)),
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'AjDfkdKeKxRdAbhT2r38Jwb2tjzMR/q4DyrP57ptVBE=',
                },
                inputScript:
                    'QdJXs/BT7P1rhj6gCazJk6zsCOLajy76fy5IQLNbAyL9CRr5qQph1Gfm8QP6k2uxGXOg+qIDzaSG6tK+u2ZPg0FBIQKyfAIizzpmkawjjTom8qRJV+LXdAF5yFrvDaJVtq2Wvw==',
                outputScript: SYNTHETIC_P2PKH_OUTPUT_SCRIPT,
                sats: String(SYNTHETIC_INPUT_SATS),
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            // Rx output
            {
                sats: String(amountSats),
                outputScript: STUB_WALLET_OUTPUT_SCRIPT,
            },
            // Change output
            {
                sats: String(
                    SYNTHETIC_INPUT_SATS - amountSats - SYNTHETIC_FEE_SATS,
                ),
                outputScript: SYNTHETIC_P2PKH_OUTPUT_SCRIPT,
            },
        ],
        timeFirstSeen: '1775830000',
        size: 220,
        isFinal: false,
    };
}

/** Mempool receive of Firma (ALP) to the stub wallet, with XEC change to the synthetic input script. */
function receiveFirmaTx(
    txid: string,
    tokenAtoms: string,
): Record<string, unknown> {
    const walletOutputSats = 546;
    return {
        txid: uint8ToBase64(fromHexRev(txid)),
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'AjDfkdKeKxRdAbhT2r38Jwb2tjzMR/q4DyrP57ptVBE=',
                },
                inputScript:
                    'QdJXs/BT7P1rhj6gCazJk6zsCOLajy76fy5IQLNbAyL9CRr5qQph1Gfm8QP6k2uxGXOg+qIDzaSG6tK+u2ZPg0FBIQKyfAIizzpmkawjjTom8qRJV+LXdAF5yFrvDaJVtq2Wvw==',
                outputScript: SYNTHETIC_P2PKH_OUTPUT_SCRIPT,
                sats: String(SYNTHETIC_INPUT_SATS),
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                sats: String(walletOutputSats),
                outputScript: STUB_WALLET_OUTPUT_SCRIPT,
                token: {
                    tokenId: FIRMA_TOKEN.tokenId as string,
                    tokenType: { alp: 'ALP_TOKEN_TYPE_STANDARD' },
                    atoms: tokenAtoms,
                },
            },
            {
                sats: String(
                    SYNTHETIC_INPUT_SATS -
                        walletOutputSats -
                        SYNTHETIC_FEE_SATS,
                ),
                outputScript: SYNTHETIC_P2PKH_OUTPUT_SCRIPT,
            },
        ],
        timeFirstSeen: '1775830000',
        size: 280,
        isFinal: false,
    };
}

/**
 * Synthetic send: wallet spends `walletInputSats` to pay `sendAmountSats` to an
 * external script; remainder minus `SYNTHETIC_FEE_SATS` returns as change.
 */
function sendTx(
    txid: string,
    sendAmountSats: number,
    walletInputSats: number,
): Record<string, unknown> {
    const fee = SYNTHETIC_FEE_SATS;
    return {
        txid: uint8ToBase64(fromHexRev(txid)),
        version: 2,
        inputs: [
            {
                prevOut: {
                    txid: 'AjDfkdKeKxRdAbhT2r38Jwb2tjzMR/q4DyrP57ptVBE=',
                },
                inputScript:
                    'QdJXs/BT7P1rhj6gCazJk6zsCOLajy76fy5IQLNbAyL9CRr5qQph1Gfm8QP6k2uxGXOg+qIDzaSG6tK+u2ZPg0FBIQKyfAIizzpmkawjjTom8qRJV+LXdAF5yFrvDaJVtq2Wvw==',
                outputScript: STUB_WALLET_OUTPUT_SCRIPT,
                sats: String(walletInputSats),
                sequenceNo: 4294967295,
            },
        ],
        outputs: [
            {
                sats: String(sendAmountSats),
                outputScript: SYNTHETIC_P2PKH_OUTPUT_SCRIPT,
            },
            {
                sats: String(walletInputSats - sendAmountSats - fee),
                outputScript: STUB_WALLET_OUTPUT_SCRIPT,
            },
        ],
        timeFirstSeen: '1775830000',
        size: 220,
        isFinal: false,
    };
}

function ensureWebsocketStub(win: Cypress.AUTWindow): ChronikWebSocketStub {
    const stub = (win as WindowWithChronikWebSocketStub).__chronikWebSocketStub;
    if (!stub) {
        throw new Error('Chronik WebSocket stub missing');
    }
    return stub;
}

describe('Transitional balance', () => {
    beforeEach(() => {
        stubCoingeckoXecFiatPrices();
    });

    it('shows receive transitional then available balance after mempool and finalization WS', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, undefined, {
                beforeAppLoad(win) {
                    installChronikWebSocketStub(
                        win as WindowWithChronikWebSocketStub,
                    );
                },
            });
            waitForMainLoaded();

            const syntheticTxid =
                'e2e000000000000000000000000000000000000000000000000000000000abc1';
            const amountXec = 10_000;
            const mempoolTx = receiveTx(
                syntheticTxid,
                unitToAtoms(amountXec, XEC_ASSET.decimals),
            );

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_ADDED_TO_MEMPOOL, mempoolTx);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'receive')
                .and($el => {
                    const t = normalizeBalanceText($el.text());
                    expect(t).to.equal(
                        formatPrice(amountXec, CryptoTicker.XEC, {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                            alwaysShowSign: true,
                        }),
                    );
                });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(
                    TxMsgType.TX_FINALIZED,
                    mempoolTx,
                    TxFinalizationReasonType.TX_FINALIZATION_REASON_PRE_CONSENSUS,
                );
            });

            cy.get('#transitional-balance').should('have.class', 'hidden');

            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(
                        STUB_AVAILABLE_XEC + amountXec,
                        CryptoTicker.XEC,
                        {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                        },
                    ),
                );
            });
        });
    });

    it('shows receive transitional in Firma then available balance after mempool and finalization WS', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, undefined, {
                beforeAppLoad(win) {
                    installChronikWebSocketStub(
                        win as WindowWithChronikWebSocketStub,
                    );
                },
            });
            waitForMainLoaded();

            selectFirmaAsset();

            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatFirmaAmount(
                        atomsToUnit(
                            STUB_AVAILABLE_FIRMA_ATOMS,
                            FIRMA_TOKEN.decimals,
                        ),
                    ),
                );
            });

            const syntheticTxid =
                'e2e000000000000000000000000000000000000000000000000000000000f1ea';
            const receiveAtoms = 10_000;
            const mempoolTx = receiveFirmaTx(
                syntheticTxid,
                String(receiveAtoms),
            );
            const expectedTransitionalFirma = formatFirmaAmount(
                atomsToUnit(receiveAtoms, FIRMA_TOKEN.decimals),
                { alwaysShowSign: true },
            );

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_ADDED_TO_MEMPOOL, mempoolTx);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'receive')
                .and($el => {
                    const t = normalizeBalanceText($el.text());
                    expect(t).to.equal(expectedTransitionalFirma);
                });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(
                    TxMsgType.TX_FINALIZED,
                    mempoolTx,
                    TxFinalizationReasonType.TX_FINALIZATION_REASON_PRE_CONSENSUS,
                );
            });

            cy.get('#transitional-balance').should('have.class', 'hidden');

            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatFirmaAmount(
                        atomsToUnit(
                            STUB_AVAILABLE_FIRMA_ATOMS + receiveAtoms,
                            FIRMA_TOKEN.decimals,
                        ),
                    ),
                );
            });
        });
    });

    it('shows spend transitional then available balance after mempool and finalization WS', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, undefined, {
                beforeAppLoad(win) {
                    installChronikWebSocketStub(
                        win as WindowWithChronikWebSocketStub,
                    );
                },
            });
            waitForMainLoaded();

            const syntheticTxid =
                'e2e000000000000000000000000000000000000000000000000000000000abc2';
            const amountXec = 10_000;
            const sendAmountSats = unitToAtoms(amountXec, XEC_ASSET.decimals);
            const mempoolTx = sendTx(
                syntheticTxid,
                sendAmountSats,
                SYNTHETIC_INPUT_SATS,
            );
            const sendDeltaSats = -(sendAmountSats + SYNTHETIC_FEE_SATS);

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_ADDED_TO_MEMPOOL, mempoolTx);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'spend')
                .and($el => {
                    const t = normalizeBalanceText($el.text());
                    expect(t).to.equal(
                        formatPrice(
                            atomsToUnit(sendDeltaSats, XEC_ASSET.decimals),
                            CryptoTicker.XEC,
                            {
                                locale: DEFAULT_LOCALE,
                                decimals: 2,
                                alwaysShowSign: true,
                            },
                        ),
                    );
                });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(
                    TxMsgType.TX_FINALIZED,
                    mempoolTx,
                    TxFinalizationReasonType.TX_FINALIZATION_REASON_PRE_CONSENSUS,
                );
            });

            cy.get('#transitional-balance').should('have.class', 'hidden');

            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(
                        STUB_AVAILABLE_XEC +
                            atomsToUnit(sendDeltaSats, XEC_ASSET.decimals),
                        CryptoTicker.XEC,
                        { locale: DEFAULT_LOCALE, decimals: 2 },
                    ),
                );
            });
        });
    });

    it('shows spend transitional amount in fiat then finalizes to updated fiat primary (settings before tx)', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, undefined, {
                beforeAppLoad(win) {
                    installChronikWebSocketStub(
                        win as WindowWithChronikWebSocketStub,
                    );
                },
            });
            waitForMainLoaded();

            openSettingsFromMain();
            cy.get('#primary-balance-toggle').should('not.be.checked');
            cy.get('#primary-balance-toggle').check({ force: true });
            cy.get('#primary-balance-toggle').should('be.checked');
            cy.get('#settings-back-btn').click();
            cy.get('#main-screen').should('be.visible');

            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(
                        STUB_AVAILABLE_XEC * STUB_USD_PER_XEC,
                        Fiat.USD,
                        { locale: DEFAULT_LOCALE },
                    ),
                );
            });

            const syntheticTxid =
                'e2e000000000000000000000000000000000000000000000000000000000abc9';
            const amountXec = 10_000;
            const sendAmountSats = unitToAtoms(amountXec, XEC_ASSET.decimals);
            const mempoolTx = sendTx(
                syntheticTxid,
                sendAmountSats,
                SYNTHETIC_INPUT_SATS,
            );
            const sendDeltaSats = -(sendAmountSats + SYNTHETIC_FEE_SATS);
            const transitionalXec = atomsToUnit(
                sendDeltaSats,
                XEC_ASSET.decimals,
            );
            const expectedTransitionalUsd = formatPrice(
                transitionalXec * STUB_USD_PER_XEC,
                Fiat.USD,
                { locale: DEFAULT_LOCALE, alwaysShowSign: true },
            );

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_ADDED_TO_MEMPOOL, mempoolTx);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'spend')
                .and($el => {
                    const t = normalizeBalanceText($el.text());
                    expect(t).to.equal(expectedTransitionalUsd);
                    expect(t.toUpperCase()).not.to.include('XEC');
                });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(
                    TxMsgType.TX_FINALIZED,
                    mempoolTx,
                    TxFinalizationReasonType.TX_FINALIZATION_REASON_PRE_CONSENSUS,
                );
            });

            cy.get('#transitional-balance').should('have.class', 'hidden');
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                const availableXecAfter =
                    STUB_AVAILABLE_XEC +
                    atomsToUnit(sendDeltaSats, XEC_ASSET.decimals);
                expect(t).to.equal(
                    formatPrice(
                        availableXecAfter * STUB_USD_PER_XEC,
                        Fiat.USD,
                        { locale: DEFAULT_LOCALE },
                    ),
                );
            });
        });
    });

    it('moves receive from transitional to available when post-consensus finalizes without pre-consensus', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, undefined, {
                beforeAppLoad(win) {
                    installChronikWebSocketStub(
                        win as WindowWithChronikWebSocketStub,
                    );
                },
            });
            waitForMainLoaded();

            const syntheticTxid =
                'e2e000000000000000000000000000000000000000000000000000000000abc5';
            const amountXec = 2500;
            const mempoolTx = receiveTx(
                syntheticTxid,
                unitToAtoms(amountXec, XEC_ASSET.decimals),
            );

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_ADDED_TO_MEMPOOL, mempoolTx);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'receive')
                .and($el => {
                    const t = normalizeBalanceText($el.text());
                    expect(t).to.equal(
                        formatPrice(amountXec, CryptoTicker.XEC, {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                            alwaysShowSign: true,
                        }),
                    );
                });
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(STUB_AVAILABLE_XEC, CryptoTicker.XEC, {
                        locale: DEFAULT_LOCALE,
                        decimals: 2,
                    }),
                );
            });

            // Tx confirmed as no effect
            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_CONFIRMED, mempoolTx);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'receive')
                .and($el => {
                    const t = normalizeBalanceText($el.text());
                    expect(t).to.equal(
                        formatPrice(amountXec, CryptoTicker.XEC, {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                            alwaysShowSign: true,
                        }),
                    );
                });
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(STUB_AVAILABLE_XEC, CryptoTicker.XEC, {
                        locale: DEFAULT_LOCALE,
                        decimals: 2,
                    }),
                );
            });

            // But post-consensus finalization adds to available balance
            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(
                    TxMsgType.TX_FINALIZED,
                    mempoolTx,
                    TxFinalizationReasonType.TX_FINALIZATION_REASON_POST_CONSENSUS,
                );
            });

            cy.get('#transitional-balance').should('have.class', 'hidden');
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(
                        STUB_AVAILABLE_XEC + amountXec,
                        CryptoTicker.XEC,
                        {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                        },
                    ),
                );
            });
        });
    });

    it('moves receive from transitional to available when tx is discovered in-block then post-consensus finalizes (no mempool WS)', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, undefined, {
                beforeAppLoad(win) {
                    installChronikWebSocketStub(
                        win as WindowWithChronikWebSocketStub,
                    );
                },
            });
            waitForMainLoaded();

            const syntheticTxid =
                'e2e000000000000000000000000000000000000000000000000000000000abc6';
            const amountXec = 1800;
            const confirmedTx = receiveTx(
                syntheticTxid,
                unitToAtoms(amountXec, XEC_ASSET.decimals),
            );

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_CONFIRMED, confirmedTx);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'receive')
                .and($el => {
                    const t = normalizeBalanceText($el.text());
                    expect(t).to.equal(
                        formatPrice(amountXec, CryptoTicker.XEC, {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                            alwaysShowSign: true,
                        }),
                    );
                });
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(STUB_AVAILABLE_XEC, CryptoTicker.XEC, {
                        locale: DEFAULT_LOCALE,
                        decimals: 2,
                    }),
                );
            });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(
                    TxMsgType.TX_FINALIZED,
                    confirmedTx,
                    TxFinalizationReasonType.TX_FINALIZATION_REASON_POST_CONSENSUS,
                );
            });

            cy.get('#transitional-balance').should('have.class', 'hidden');
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(
                        STUB_AVAILABLE_XEC + amountXec,
                        CryptoTicker.XEC,
                        {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                        },
                    ),
                );
            });
        });
    });

    it('clears receive transitional after mempool remove then avalanche invalidate WS', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, undefined, {
                beforeAppLoad(win) {
                    installChronikWebSocketStub(
                        win as WindowWithChronikWebSocketStub,
                    );
                },
            });
            waitForMainLoaded();

            const syntheticTxid =
                'e2e000000000000000000000000000000000000000000000000000000000abc7';
            const amountXec = 2200;
            const mempoolTx = receiveTx(
                syntheticTxid,
                unitToAtoms(amountXec, XEC_ASSET.decimals),
            );

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_ADDED_TO_MEMPOOL, mempoolTx);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'receive')
                .and($el => {
                    const t = normalizeBalanceText($el.text());
                    expect(t).to.equal(
                        formatPrice(amountXec, CryptoTicker.XEC, {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                            alwaysShowSign: true,
                        }),
                    );
                });
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(STUB_AVAILABLE_XEC, CryptoTicker.XEC, {
                        locale: DEFAULT_LOCALE,
                        decimals: 2,
                    }),
                );
            });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(
                    TxMsgType.TX_REMOVED_FROM_MEMPOOL,
                    mempoolTx,
                );
            });

            cy.get('#transitional-balance').should('have.class', 'hidden');
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(STUB_AVAILABLE_XEC, CryptoTicker.XEC, {
                        locale: DEFAULT_LOCALE,
                        decimals: 2,
                    }),
                );
            });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_INVALIDATED, mempoolTx);
            });

            cy.get('#transitional-balance').should('have.class', 'hidden');
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(STUB_AVAILABLE_XEC, CryptoTicker.XEC, {
                        locale: DEFAULT_LOCALE,
                        decimals: 2,
                    }),
                );
            });
        });
    });

    it('adds receive to available when pre-consensus finalizes without mempool WS', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, undefined, {
                beforeAppLoad(win) {
                    installChronikWebSocketStub(
                        win as WindowWithChronikWebSocketStub,
                    );
                },
            });
            waitForMainLoaded();

            const syntheticTxid =
                'e2e000000000000000000000000000000000000000000000000000000000abc8';
            const amountXec = 900;
            const finalizedTx = receiveTx(
                syntheticTxid,
                unitToAtoms(amountXec, XEC_ASSET.decimals),
            );

            cy.get('#transitional-balance').should('have.class', 'hidden');
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(STUB_AVAILABLE_XEC, CryptoTicker.XEC, {
                        locale: DEFAULT_LOCALE,
                        decimals: 2,
                    }),
                );
            });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                // This could happen if the wallet app is started while there is
                // a tx in the mempool (but not finalized yet).
                stub.emitTxWebsocket(
                    TxMsgType.TX_FINALIZED,
                    finalizedTx,
                    TxFinalizationReasonType.TX_FINALIZATION_REASON_PRE_CONSENSUS,
                );
            });

            // The amount is immediately added to available balance.
            cy.get('#transitional-balance').should('have.class', 'hidden');
            cy.get('#primary-balance').should($el => {
                const t = normalizeBalanceText($el.text());
                expect(t).to.equal(
                    formatPrice(
                        STUB_AVAILABLE_XEC + amountXec,
                        CryptoTicker.XEC,
                        {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                        },
                    ),
                );
            });
        });
    });

    it('cumulates transitional for two mempool receives then finalizes one by one', () => {
        runWithChronik(CHRONIK_STUB, () => {
            visitWithWalletMnemonic(TEST_MNEMONIC, undefined, {
                beforeAppLoad(win) {
                    installChronikWebSocketStub(
                        win as WindowWithChronikWebSocketStub,
                    );
                },
            });
            waitForMainLoaded();

            const amountXec1 = 3000;
            const amountXec2 = 4000;
            const mempoolTx1 = receiveTx(
                'e2e000000000000000000000000000000000000000000000000000000000abc3',
                unitToAtoms(amountXec1, XEC_ASSET.decimals),
            );
            const mempoolTx2 = receiveTx(
                'e2e000000000000000000000000000000000000000000000000000000000abc4',
                unitToAtoms(amountXec2, XEC_ASSET.decimals),
            );

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_ADDED_TO_MEMPOOL, mempoolTx1);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'receive')
                .and($el => {
                    expect(normalizeBalanceText($el.text())).to.equal(
                        formatPrice(amountXec1, CryptoTicker.XEC, {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                            alwaysShowSign: true,
                        }),
                    );
                });
            cy.get('#primary-balance').should($el => {
                expect(normalizeBalanceText($el.text())).to.equal(
                    formatPrice(STUB_AVAILABLE_XEC, CryptoTicker.XEC, {
                        locale: DEFAULT_LOCALE,
                        decimals: 2,
                    }),
                );
            });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(TxMsgType.TX_ADDED_TO_MEMPOOL, mempoolTx2);
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'receive')
                .and($el => {
                    expect(normalizeBalanceText($el.text())).to.equal(
                        formatPrice(amountXec1 + amountXec2, CryptoTicker.XEC, {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                            alwaysShowSign: true,
                        }),
                    );
                });
            cy.get('#primary-balance').should($el => {
                expect(normalizeBalanceText($el.text())).to.equal(
                    formatPrice(STUB_AVAILABLE_XEC, CryptoTicker.XEC, {
                        locale: DEFAULT_LOCALE,
                        decimals: 2,
                    }),
                );
            });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(
                    TxMsgType.TX_FINALIZED,
                    mempoolTx1,
                    TxFinalizationReasonType.TX_FINALIZATION_REASON_PRE_CONSENSUS,
                );
            });

            cy.get('#transitional-balance')
                .should('be.visible')
                .and('have.class', 'receive')
                .and($el => {
                    expect(normalizeBalanceText($el.text())).to.equal(
                        formatPrice(amountXec2, CryptoTicker.XEC, {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                            alwaysShowSign: true,
                        }),
                    );
                });
            cy.get('#primary-balance').should($el => {
                expect(normalizeBalanceText($el.text())).to.equal(
                    formatPrice(
                        STUB_AVAILABLE_XEC + amountXec1,
                        CryptoTicker.XEC,
                        {
                            locale: DEFAULT_LOCALE,
                            decimals: 2,
                        },
                    ),
                );
            });

            cy.window().then(win => {
                const stub = ensureWebsocketStub(win);
                stub.emitTxWebsocket(
                    TxMsgType.TX_FINALIZED,
                    mempoolTx2,
                    TxFinalizationReasonType.TX_FINALIZATION_REASON_PRE_CONSENSUS,
                );
            });

            cy.get('#transitional-balance').should('have.class', 'hidden');
            cy.get('#primary-balance').should($el => {
                expect(normalizeBalanceText($el.text())).to.equal(
                    formatPrice(
                        STUB_AVAILABLE_XEC + amountXec1 + amountXec2,
                        CryptoTicker.XEC,
                        { locale: DEFAULT_LOCALE, decimals: 2 },
                    ),
                );
            });
        });
    });
});
