// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tx from 'components/Home/Tx';
import {
    incomingXec,
    outgoingXec,
    stakingRwd,
    aliasRegistration,
    mockParseTxWallet,
    mockAliasWallet,
    incomingEtoken,
    outgoingEtoken,
    genesisTx,
    incomingEtokenNineDecimals,
    legacyAirdropTx,
    onSpecAirdropTxNoMsg,
    outgoingEncryptedMsg,
    incomingEncryptedMsg,
    tokenBurn,
    tokenBurnDecimals,
    swapTx,
    PayButtonNoDataYesNonce,
    PayButtonYesDataYesNonce,
    PayButtonEmpty,
    PayButtonYesDataNoNonce,
    PayButtonOffSpec,
    PayButtonBadVersion,
    MsgFromEcashChat,
    SlpV1Mint,
    MsgFromElectrum,
    unknownAppTx,
    AlpTx,
    CashtabMsg,
    mockParseTxWalletAirdrop,
    mockParseTxWalletEncryptedMsg,
    mockParseTxTokenCache,
    mockLargeTokenCache,
    mockTxHistorySupportingTokenCache,
    SlpNftParentFanTx,
    SlpNftMint,
    SlpParentGenesisTxMock,
} from 'chronik/fixtures/mocks';
import CashtabState from 'config/CashtabState';
import { MemoryRouter } from 'react-router-dom';
import { getHashes } from 'wallet';

// https://stackoverflow.com/questions/39830580/jest-test-fails-typeerror-window-matchmedia-is-not-a-function
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// https://stackoverflow.com/questions/64813447/cannot-read-property-addlistener-of-undefined-react-testing-library
window.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
});

const AVALANCHE_FINALIZED_CHAINTIP = 800000;

describe('<Tx />', () => {
    it('Incoming XEC-only, avalanche finalized', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={incomingXec.tx}
                        hashes={getHashes(mockParseTxWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx received icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the tx received label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // For a tx with timeFirstSeen of 0, we render the block timestamp
        expect(screen.getByText('May 17, 2022, 18:35:28')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('42 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We see the avalanche finalized check (twice, one is in the expand panel)
        expect(
            screen.getAllByTitle('Finalized by Avalanche')[1],
        ).toBeInTheDocument();
    });
    it('Incoming XEC-only, not yet finalized by Avalanche', async () => {
        const AVALANCHE_UNFINALIZED_CHAINTIP = 0;

        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={incomingXec.tx}
                        hashes={getHashes(mockParseTxWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                        chaintipBlockheight={AVALANCHE_UNFINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx received icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the tx received label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // For a tx with timeFirstSeen of 0, we render the block timestamp
        expect(screen.getByText('May 17, 2022, 18:35:28')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('42 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We do not see the avalanche finalized check
        expect(
            screen.queryByTitle('Finalized by Avalanche'),
        ).not.toBeInTheDocument();

        // We see two inline-loader elements
        expect(screen.getAllByTitle('Loading')[1]).toBeInTheDocument();

        // We see the 'Confirming' text
        expect(screen.getByText('Confirming')).toBeInTheDocument();
    });
    it('Outgoing XEC-only', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={outgoingXec.tx}
                        hashes={getHashes(mockParseTxWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx sent icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see the tx sent label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // For a tx with timeFirstSeen of 0, we render the block timestamp
        expect(screen.getByText('May 17, 2022, 21:46:58')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-222 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.01')).toBeInTheDocument();
    });
    it('Staking reward received by Cashtab wallet', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={stakingRwd.tx}
                        hashes={getHashes(mockParseTxWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx sent icon
        expect(screen.getByTitle('tx-mined')).toBeInTheDocument();

        // We see the tx sent label
        expect(screen.getByText('Staking Reward')).toBeInTheDocument();

        // Coinbase txs have timeFirstSeen of 0
        // For a tx with timeFirstSeen of 0, we render the block timestamp
        expect(screen.getByText('Nov 15, 2023, 15:37:13')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('625.01k XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$18.75')).toBeInTheDocument();
    });
    it('Alias registration (v0)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={aliasRegistration.tx}
                        hashes={getHashes(mockAliasWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx sent icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see the tx sent label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 3, 2023, 12:14:36')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-5.55 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // Alias registration app action
        // We see the alias registration icon
        expect(screen.getByTitle('tx-alias-registration')).toBeInTheDocument();
        // We see the alias registration description
        expect(screen.getByText('bug2 to qqx...kqz')).toBeInTheDocument();
    });
    it('Invalid alias registration (v0)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...aliasRegistration.tx,
                            outputs: [
                                {
                                    ...aliasRegistration.tx.outputs[0],
                                    outputScript:
                                        '6a042e786563010104627567321500dc1147663948f0dcfb00cc407eda41b121713ad3',
                                },
                                ...aliasRegistration.tx.outputs.slice(1),
                            ],
                        }}
                        hashes={getHashes(mockAliasWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx sent icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see the tx sent label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // Coinbase txs have timeFirstSeen of 0
        // For a tx with timeFirstSeen of 0, we render the block timestamp
        expect(screen.getByText('Oct 3, 2023, 12:14:36')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-5.55 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // Alias registration app action
        // We see the alias registration icon
        expect(screen.getByTitle('tx-alias-registration')).toBeInTheDocument();
        // We see the alias registration description
        expect(
            screen.getByText('Invalid alias registration'),
        ).toBeInTheDocument();
    });
    it('Another invalid alias registration (v0)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...aliasRegistration.tx,
                            outputs: [
                                {
                                    ...aliasRegistration.tx.outputs[0],
                                    outputScript:
                                        '6a042e7865630d616e64616e6f746865726f6e65',
                                },
                                ...aliasRegistration.tx.outputs.slice(1),
                            ],
                        }}
                        hashes={getHashes(mockAliasWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx sent icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see the tx sent label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // Coinbase txs have timeFirstSeen of 0
        // For a tx with timeFirstSeen of 0, we render the block timestamp
        expect(screen.getByText('Oct 3, 2023, 12:14:36')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-5.55 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // Alias registration app action
        // We see the alias registration icon
        expect(screen.getByTitle('tx-alias-registration')).toBeInTheDocument();
        // We see the alias registration description
        expect(
            screen.getByText('Invalid alias registration'),
        ).toBeInTheDocument();
    });
    it('Received slpv1 fungible token', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={incomingEtoken.tx}
                        hashes={getHashes(mockParseTxWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx received icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the tx received label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // For a tx with timeFirstSeen of 0, we render the block timestamp
        expect(screen.getByText('May 17, 2022, 21:17:04')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('5.46 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for 4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            ),
        ).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText('Covid19 Lifetime Immunity'),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(NOCOVID)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Received 12 NOCOVID')).toBeInTheDocument();
    });
    it('Received slpv1 fungible token with no token info in cache', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={incomingEtoken.tx}
                        hashes={getHashes(mockParseTxWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx received icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the tx received label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // For a tx with timeFirstSeen of 0, we render the block timestamp
        expect(screen.getByText('May 17, 2022, 21:17:04')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('5.46 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for 4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            ),
        ).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We do not see the token name
        expect(
            screen.queryByText('Covid19 Lifetime Immunity'),
        ).not.toBeInTheDocument();

        // We do not see the token ticker in parenthesis in the summary column
        expect(screen.queryByText('(NOCOVID)')).not.toBeInTheDocument();

        // We see the expected token action with no quantity
        expect(screen.getByText('Received')).toBeInTheDocument();
    });
    it('Sent slpv1 fungible token', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={outgoingEtoken.tx}
                        hashes={getHashes(mockParseTxWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx sent icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see the tx sent label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('May 17, 2022, 21:46:58')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-5.46 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for 4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            ),
        ).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText('Covid19 Lifetime Immunity'),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(NOCOVID)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Sent 17 NOCOVID')).toBeInTheDocument();
    });
    it('Sent slpv1 fungible token with no token info in cache', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={outgoingEtoken.tx}
                        hashes={getHashes(mockParseTxWallet)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx sent icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see the tx sent label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('May 17, 2022, 21:46:58')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-5.46 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for 4bd147fc5d5ff26249a9299c46b80920c0b81f59a60e05428262160ebee0b0c3',
            ),
        ).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We do not see the token name
        expect(
            screen.queryByText('Covid19 Lifetime Immunity'),
        ).not.toBeInTheDocument();

        // We do not see the token ticker in parenthesis in the summary column
        expect(screen.queryByText('(NOCOVID)')).not.toBeInTheDocument();

        // We see the expected token action with no amount
        expect(screen.getByText('Sent')).toBeInTheDocument();
    });
    it('slpv1 fungible token GENESIS', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={genesisTx.tx}
                        hashes={getHashes(mockParseTxWalletAirdrop)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Sep 26, 2022, 21:11:49')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            ),
        ).toBeInTheDocument();

        // We see the genesis icon
        expect(screen.getByTitle('tx-genesis')).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('UpdateTest')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(UDT)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Created 777.7777777 UDT')).toBeInTheDocument();
    });
    it('slpv1 fungible token GENESIS with no token info in cache', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={genesisTx.tx}
                        hashes={getHashes(mockParseTxWalletAirdrop)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Sep 26, 2022, 21:11:49')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for cf601c56b58bc05a39a95374a4a865f0a8b56544ea937b30fb46315441717c50',
            ),
        ).toBeInTheDocument();

        // We see the genesis icon
        expect(screen.getByTitle('tx-genesis')).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We do not see the token name
        expect(screen.queryByText('UpdateTest')).not.toBeInTheDocument();

        // We do not see the token ticker in parenthesis in the summary column
        expect(screen.queryByText('(UDT)')).not.toBeInTheDocument();

        // We see the expected token action presented without quantity or other token info
        expect(screen.getByText('Created')).toBeInTheDocument();
    });
    it('Received slpv1 fungible token amount less than 1 with 9 decimals', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={incomingEtokenNineDecimals.tx}
                        hashes={getHashes(mockParseTxWalletAirdrop)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx received icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the tx received label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 3, 2022, 23:37:46')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('5.46 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            ),
        ).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('CashTabBits')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(CTB)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Received .123456789 CTB')).toBeInTheDocument();
    });
    it('Received slpv1 fungible token with 9 decimals with no token info in cache', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={incomingEtokenNineDecimals.tx}
                        hashes={getHashes(mockParseTxWalletAirdrop)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx received icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the tx received label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 3, 2022, 23:37:46')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('5.46 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for acba1d7f354c6d4d001eb99d31de174e5cea8a31d692afd6e7eb8474ad541f55',
            ),
        ).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We do not see the token name
        expect(screen.queryByText('CashTabBits')).not.toBeInTheDocument();

        // We do not see the token ticker in parenthesis in the summary column
        expect(screen.queryByText('(CTB)')).not.toBeInTheDocument();

        // We see the expected token action text without quantity or ticker
        expect(screen.getByText('Received')).toBeInTheDocument();
    });
    it('Received airdrop with msg (legacy push) with no token info in cache', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={legacyAirdropTx.tx}
                        hashes={getHashes(mockParseTxWalletAirdrop)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 1, 2022, 23:36:08')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('5.69 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // Airdrop app action
        // We see the airdrop icon
        expect(screen.getByTitle('tx-airdrop')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for bdb3b4215ca0622e0c4c07655522c376eaa891838a82f0217fa453bb0595a37c',
            ),
        ).toBeInTheDocument();

        // We see airdrop msg
        expect(screen.getByText('Airdrop to holders of')).toBeInTheDocument();
        // We see the airdrop msg
        expect(
            screen.getByText(
                'evc token service holders air drop🥇🌐🥇❤👌🛬🛬🍗🤴',
            ),
        ).toBeInTheDocument();
        // The token icon itself is abbreviated to show first and last 3 chars
        expect(screen.getByText('bdb...37c')).toBeInTheDocument();
    });
    it('Sent airdrop with msg with token info in cache', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={onSpecAirdropTxNoMsg.tx}
                        hashes={['2a96944d06700882bbd984761d9c9e4215f2d78e']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockLargeTokenCache },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Mar 22, 2024, 10:07:32')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-2k XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.06')).toBeInTheDocument();

        // Airdrop app action
        // We see the airdrop icon
        expect(screen.getByTitle('tx-airdrop')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for fb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87aa',
            ),
        ).toBeInTheDocument();

        // We see token info in column
        expect(screen.getByText('SLP 1')).toBeInTheDocument();
        expect(screen.getByText('GRUMPY')).toBeInTheDocument();
        expect(screen.getByText('(GRP)')).toBeInTheDocument();

        // We see airdrop label
        expect(screen.getByText('Airdrop (XEC)')).toBeInTheDocument();
        // We see the airdrop msg
        expect(
            screen.getByText(
                'ATTENTION GRUMPY PEOPLE! 😾 You can now deposit $GRP to the eToken bot at t.me/eCashPlay to top up your Casino Credits! 1m $GRP = 1 Credit. Play Casino games and win XEC!',
            ),
        ).toBeInTheDocument();
    });
    it('Off-spec airdrop tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...onSpecAirdropTxNoMsg.tx,
                            outputs: [
                                {
                                    ...onSpecAirdropTxNoMsg.tx.outputs[0],
                                    outputScript:
                                        '6a0464726f701ffb4233e8a568993976ed38a81c2671587c5ad09552dedefa78760deed6ff87',
                                },
                                ...onSpecAirdropTxNoMsg.tx.outputs.slice(1),
                            ],
                        }}
                        hashes={['2a96944d06700882bbd984761d9c9e4215f2d78e']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockLargeTokenCache },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Mar 22, 2024, 10:07:32')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-2k XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.06')).toBeInTheDocument();

        // Airdrop app action
        // We see the airdrop icon
        expect(screen.getByTitle('tx-airdrop')).toBeInTheDocument();

        // We get the off-spec airdrop action
        expect(
            screen.getByText('Off-spec airdrop: tokenId unavailable'),
        ).toBeInTheDocument();
    });
    it('Sent encrypted msg', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={outgoingEncryptedMsg.tx}
                        hashes={getHashes(mockParseTxWalletEncryptedMsg)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 4, 2022, 19:08:19')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-12 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // Encrypted msg app action
        // We see the encrypted msg icon
        expect(screen.getByTitle('tx-encrypted-msg')).toBeInTheDocument();

        // We see expected text msg
        expect(screen.getByText('Encrypted Cashtab Msg')).toBeInTheDocument();
    });
    it('Received encrypted msg', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={incomingEncryptedMsg.tx}
                        hashes={getHashes(mockParseTxWalletEncryptedMsg)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 4, 2022, 19:08:19')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('11 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // Encrypted msg app action
        // We see the encrypted msg icon
        expect(screen.getByTitle('tx-encrypted-msg')).toBeInTheDocument();

        // We see expected text msg
        expect(screen.getByText('Encrypted Cashtab Msg')).toBeInTheDocument();
    });
    it('Burn slpv1 fungible token', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={tokenBurn.tx}
                        hashes={getHashes(mockParseTxWalletAirdrop)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 4, 2022, 22:11:00')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for 4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            ),
        ).toBeInTheDocument();

        // We see the token burn icon
        expect(screen.getByTitle('tx-token-burn')).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('Lambda Variant Variants')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(LVV)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Burned 12 LVV')).toBeInTheDocument();
    });
    it('Burn slpv1 fungible token with no token info in cache', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={tokenBurn.tx}
                        hashes={getHashes(mockParseTxWalletAirdrop)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 4, 2022, 22:11:00')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for 4db25a4b2f0b57415ce25fab6d9cb3ac2bbb444ff493dc16d0615a11ad06c875',
            ),
        ).toBeInTheDocument();

        // We see the token burn icon
        expect(screen.getByTitle('tx-token-burn')).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We do not see the token name
        expect(
            screen.queryByText('Lambda Variant Variants'),
        ).not.toBeInTheDocument();

        // We do notsee the token ticker in parenthesis in the summary column
        expect(screen.queryByText('(LVV)')).not.toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Burned')).toBeInTheDocument();
    });
    it('Burn slpv1 fungible token with 9 decimals', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={tokenBurnDecimals.tx}
                        hashes={getHashes(mockParseTxWalletAirdrop)}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 4, 2022, 22:46:25')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for 7443f7c831cdf2b2b04d5f0465ed0bcf348582675b0e4f17906438c232c22f3d',
            ),
        ).toBeInTheDocument();

        // We see the token burn icon
        expect(screen.getByTitle('tx-token-burn')).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText(
                'Test Token With Exceptionally Long Name For CSS And Style Revisions',
            ),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(WDT)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Burned .1234567 WDT')).toBeInTheDocument();
    });
    it('Swap tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={swapTx.tx}
                        hashes={['93472d56ba91581ed473225a765dd14a2db5d9d8']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Apr 8, 2024, 24:18:59')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // SWaP msg app action
        // We see the SWaP icon
        expect(screen.getByTitle('swap')).toBeInTheDocument();

        // We see expected text msg
        expect(screen.getByText('SWaP')).toBeInTheDocument();
    });
    it('Received PayButton tx with nonce and no data', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={PayButtonNoDataYesNonce.tx}
                        hashes={['f66d2760b20dc7a47d9cf1a2b2f49749bf7093f6']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Jan 27, 2024, 02:42:14')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('18 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // PayButton msg app action
        // We see the PayButton logo
        expect(screen.getByAltText('tx-paybutton')).toBeInTheDocument();

        // We see the nonce
        expect(screen.getByText('d980190d13019567')).toBeInTheDocument();
    });
    it('Sent PayButton tx with nonce and data', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={PayButtonYesDataYesNonce.tx}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Jan 27, 2024, 02:40:34')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-34.02k XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$1.02')).toBeInTheDocument();

        // PayButton msg app action
        // We see the PayButton logo
        expect(screen.getByAltText('tx-paybutton')).toBeInTheDocument();

        // We see the data
        expect(screen.getByText('😂👍')).toBeInTheDocument();

        // We see the nonce
        expect(screen.getByText('69860643e4dc4c88')).toBeInTheDocument();
    });
    it('Sent empty PayButton tx (no nonce, no data)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={PayButtonEmpty.tx}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Jan 27, 2024, 02:40:34')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-34.02k XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$1.02')).toBeInTheDocument();

        // PayButton msg app action
        // We see the PayButton logo
        expect(screen.getByAltText('tx-paybutton')).toBeInTheDocument();

        // We do not see the data
        expect(screen.queryByText('😂👍')).not.toBeInTheDocument();

        // We do not see the nonce
        expect(screen.queryByText('69860643e4dc4c88')).not.toBeInTheDocument();
    });
    it('Sent PayButton tx with data but no nonce', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={PayButtonYesDataNoNonce.tx}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Jan 27, 2024, 02:40:34')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-34.02k XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$1.02')).toBeInTheDocument();

        // PayButton msg app action
        // We see the PayButton logo
        expect(screen.getByAltText('tx-paybutton')).toBeInTheDocument();

        // We see the data
        expect(screen.getByText('only data here')).toBeInTheDocument();

        // We do not see the nonce
        expect(screen.queryByText('69860643e4dc4c88')).not.toBeInTheDocument();
    });
    it('Off-spec PayButton tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={PayButtonOffSpec.tx}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Jan 27, 2024, 02:40:34')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-34.02k XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$1.02')).toBeInTheDocument();

        // PayButton msg app action
        // We see the PayButton logo
        expect(screen.getByAltText('tx-paybutton')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('(Invalid)')).toBeInTheDocument();
    });
    it('Unsupported version PayButton tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={PayButtonBadVersion.tx}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Jan 27, 2024, 02:40:34')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-34.02k XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$1.02')).toBeInTheDocument();

        // PayButton msg app action
        // We see the PayButton logo
        expect(screen.getByAltText('tx-paybutton')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('(Invalid)')).toBeInTheDocument();
    });
    it('eCash chat tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={MsgFromEcashChat.tx}
                        hashes={['0b7d35fda03544a08e65464d54cfae4257eb6db7']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Mar 30, 2024, 08:54:10')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('10 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // eCash chat msg app action
        // We see the eCash Chat logo
        expect(screen.getByTitle('tx-chat')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('eCash Chat')).toBeInTheDocument();

        // We see expected chat msg
        expect(
            screen.getByText('hello from eCash Chat 👍'),
        ).toBeInTheDocument();

        // We do not see a reply icon for a received eCash chat, as Cashtab does not have a utf8-decoding input for them
        expect(screen.queryByTitle('reply')).not.toBeInTheDocument();
    });
    it('off-spec eCash chat tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...MsgFromEcashChat.tx,
                            outputs: [
                                {
                                    ...MsgFromEcashChat.tx.outputs[0],
                                    outputScript: '6a0463686174',
                                },
                                ...MsgFromEcashChat.tx.outputs.slice(1),
                            ],
                        }}
                        hashes={['0b7d35fda03544a08e65464d54cfae4257eb6db7']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Mar 30, 2024, 08:54:10')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('10 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // eCash chat msg app action
        // We see the eCash Chat logo
        expect(screen.getByTitle('tx-chat')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('Invalid eCash Chat')).toBeInTheDocument();
    });
    it('slpv1 fungible token MINT', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={SlpV1Mint.tx}
                        hashes={['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: mockTxHistorySupportingTokenCache,
                            },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Mar 31, 2024, 05:10:19')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
            ),
        ).toBeInTheDocument();

        // We see the mint icon
        expect(screen.getByTitle('tx-mint')).toBeInTheDocument();

        // We see the token type
        expect(screen.getAllByText('SLP')[0]).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('Cachet')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(CACHET)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Minted 1.00 CACHET')).toBeInTheDocument();
    });
    it('slpv1 fungible token MINT with no token info in cache', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={SlpV1Mint.tx}
                        hashes={['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Mar 31, 2024, 05:10:19')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
            ),
        ).toBeInTheDocument();

        // We see the mint icon
        expect(screen.getByTitle('tx-mint')).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('SLP')).toBeInTheDocument();

        // We do not see the token name
        expect(screen.queryByText('Cachet')).not.toBeInTheDocument();

        // We do not see the token ticker in parenthesis in the summary column
        expect(screen.queryByText('(CACHET)')).not.toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Minted')).toBeInTheDocument();
    });
    it('Msg sent by ElectrumABC', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={MsgFromElectrum.tx}
                        hashes={['4e532257c01b310b3b5c1fd947c79a72addf8523']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Mar 2, 2024, 04:21:10')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('6 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // Unknown msg app action
        // We see the Unknown logo
        expect(screen.getByTitle('tx-unknown')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('Unknown App')).toBeInTheDocument();

        // We see raw hex
        expect(
            screen.getByText('74657374696e672061206d736720666f72206572726f72'),
        ).toBeInTheDocument();

        // We see attempted utf8 parsing of the msg
        expect(screen.getByText('testing a msg for error')).toBeInTheDocument();
    });
    it('Unknown App tx with long push in stackArray', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={unknownAppTx.tx}
                        hashes={['d18b7b500f17c5db64303fec630f9dbb85aa9596']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Jan 11, 2024, 08:28:45')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // Unknown msg app action
        // We see the Unknown logo
        expect(screen.getByTitle('tx-unknown')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('Unknown App')).toBeInTheDocument();

        // We see raw hex
        expect(
            screen.getByText(
                '3336616533642d4d45524f4e2d57494e227d2c7b226e616d65223a2277616c61222c226d657373616765223a223635396661313133373065333136663265613336616533642d57414c412d57494e227d5d2c227465726d73223a5b7b226e616d65223a22726566657265655075624b6579222c2274797065223a226279746573222c2276616c7565223a22303231383839303432373865626633333035393039336635393661323639376366333636386233626563396133613063363430386134353531343761623364623933227d5d7d7d7d7d',
            ),
        ).toBeInTheDocument();

        // We see attempted utf8 parsing of the msg
        expect(
            screen.getByText(
                `36ae3d-MERON-WIN"},{"name":"wala","message":"659fa11370e316f2ea36ae3d-WALA-WIN"}],"terms":[{"name":"refereePubKey","type":"bytes","value":"02188904278ebf33059093f596a2697cf3668b3bec9a3a0c6408a455147ab3db93"}]}}}}`,
            ),
        ).toBeInTheDocument();
    });
    it('Received ALP tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={AlpTx.tx}
                        hashes={['dee50f576362377dd2f031453c0bb09009acaf81']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: mockTxHistorySupportingTokenCache,
                            },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected send/receive label icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Mar 14, 2024, 17:59:21')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('5.46 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
            ),
        ).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('ALP')).toBeInTheDocument();
        // We see the token name
        expect(screen.getByText('Credo In Unum Deo')).toBeInTheDocument();
        // We see the token ticker
        expect(screen.getByText('(CRD)')).toBeInTheDocument();

        // We see the expected token action text for a received ALP fungible token tx
        expect(screen.getByText('Received 0.0650 CRD')).toBeInTheDocument();
    });
    it('Received ALP tx with token not in cache', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={AlpTx.tx}
                        hashes={['dee50f576362377dd2f031453c0bb09009acaf81']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected send/receive label icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Mar 14, 2024, 17:59:21')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('5.46 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
            ),
        ).toBeInTheDocument();

        // We see the token type
        expect(screen.getByText('ALP')).toBeInTheDocument();

        // We see the expected token action text for a received ALP fungible token tx
        expect(screen.getByText('Received')).toBeInTheDocument();
    });
    it('Received Cashtab message', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={CashtabMsg.tx}
                        hashes={[CashtabMsg.tx.outputs[1].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Apr 8, 2024, 22:48:33')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('5.5 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // Cashtab msg app action
        // We see the Cashtab Msg logo
        expect(screen.getByTitle('tx-cashtab-msg')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('Cashtab Msg')).toBeInTheDocument();

        // We see expected Cashtab msg
        expect(
            screen.getByText(
                `Merci pour le prix et bonne continuation dans vos projets de développeur... J'ai été censuré sûr télégramme jusqu'au 15 Avril 2024. Réparer le bug observé sur la page eToken Faucet?`,
            ),
        ).toBeInTheDocument();

        // We see a rendered reply icon for a received Cashtab msg
        expect(screen.getByTitle('reply')).toBeInTheDocument();
    });
    it('off-spec Cashtab msg', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...CashtabMsg.tx,
                            outputs: [
                                {
                                    ...CashtabMsg.tx.outputs[0],
                                    outputScript: '6a0400746162',
                                },
                                ...CashtabMsg.tx.outputs.slice(1),
                            ],
                        }}
                        hashes={[CashtabMsg.tx.outputs[1].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see expected icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Apr 8, 2024, 22:48:33')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('5.5 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // Cashtab msg app action
        // We see the Cashtab msg logo
        expect(screen.getByTitle('tx-cashtab-msg')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('Invalid Cashtab Msg')).toBeInTheDocument();
    });
    it('SLP1 NFT Parent fan-out tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={SlpNftParentFanTx.tx}
                        hashes={[SlpNftParentFanTx.tx.outputs[1].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(SlpNftParentFanTx.cache),
                            },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see the tx received label
        expect(screen.getByText(/to self/)).toBeInTheDocument();

        // We render locale timestamp
        expect(screen.getByText('Apr 22, 2024, 22:44:01')).toBeInTheDocument();

        // We see "-" as the amount for a self-send tx
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see a formatted fiat amount for a self-send tx
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for 12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3',
            ),
        ).toBeInTheDocument();

        // Rendered token type for SLP1 NFT Parent is NFT Collection
        expect(screen.getByText('NFT Collection')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText('The Four Half-Coins of Jin-qua'),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(4HC)')).toBeInTheDocument();

        // We see the Fan Out icon
        expect(screen.getByTitle('Fan Out')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        // TODO this should be 'Fanned out'
        // TODO calculate how many fan-out outputs were create
        expect(
            screen.getByText('Created 4 NFT Mint Inputs'),
        ).toBeInTheDocument();
    });
    it('Genesis tx of an SLP1 Child Token (i.e. "minting an NFT")', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={SlpNftMint.tx}
                        hashes={[SlpNftMint.tx.outputs[1].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(SlpNftMint.cache),
                            },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Apr 22, 2024, 23:23:17')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for fcab9a929a15ef91b5c5ca38b638e4d3f5fc49deb36fbc5c63de1fa900c8bcda',
            ),
        ).toBeInTheDocument();

        // We see the NFT mint icon
        expect(screen.getByTitle('Mint NFT')).toBeInTheDocument();

        // We see the token type
        expect(screen.getAllByText('NFT')[0]).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('Wu Fang Choi')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(WFC)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Minted 1 WFC')).toBeInTheDocument();

        // We see a second token action for burning the NFT Mint Input
        expect(screen.getByTitle('tx-token-burn')).toBeInTheDocument();
        expect(screen.getByText('Burned 1 NFT Mint Input')).toBeInTheDocument();
    });
    it('Genesis tx of an SLP1 Parent Token (i.e. "Creating an NFT Collection")', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={SlpParentGenesisTxMock.tx}
                        hashes={[
                            SlpParentGenesisTxMock.tx.outputs[1].outputScript,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(SlpParentGenesisTxMock.cache),
                            },
                        }}
                        chaintipBlockheight={AVALANCHE_FINALIZED_CHAINTIP}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Apr 25, 2024, 12:30:51')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for d2bfffd48c289cd5d43920f4f95a88ac4b9572d39d54d874394682608f56bf4a',
            ),
        ).toBeInTheDocument();

        // We see the genesis icon
        expect(screen.getByTitle('tx-genesis')).toBeInTheDocument();

        // We see the genesis action
        expect(screen.getByText('GENESIS')).toBeInTheDocument();

        // We see the token type
        expect(screen.getAllByText('NFT Collection')[0]).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('The Heisman')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(HSM)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Created 89 HSM')).toBeInTheDocument();
    });
});
