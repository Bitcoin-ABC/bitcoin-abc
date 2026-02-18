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
    invalidAliasRegistration,
    mockParseTxWallet,
    mockAliasWallet,
    incomingEtoken,
    outgoingEtoken,
    genesisTx,
    incomingEtokenNineDecimals,
    legacyAirdropTx,
    onSpecAirdropTxNoMsg,
    offSpecAirdropTx,
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
    NFToaAuthYesNonce,
    NFToaMsgNoNonce,
    NFToaOffSpec,
    MsgFromEcashChat,
    offSpecEcashChat,
    SlpV1Mint,
    MsgFromElectrum,
    unknownAppTx,
    AlpTx,
    CashtabMsg,
    offSpecCashtabMsg,
    mockParseTxWalletAirdrop,
    mockParseTxWalletEncryptedMsg,
    mockParseTxTokenCache,
    mockLargeTokenCache,
    mockTxHistorySupportingTokenCache,
    SlpNftParentFanTx,
    SlpNftMint,
    SlpParentGenesisTxMock,
    oneOutputReceivedTx,
    paywallPaymentTx,
    offSpecPaywallPaymentTx,
    eCashChatArticleTx,
    offSpecEcashChatArticleTx,
    eCashChatArticleReplyTx,
    offSpecEcashChatArticleReplyTx,
    eCashChatAuthenticationTx,
    agoraAdSetupTxSlpNft,
    agoraOneshotBuyTx,
    agoraOneshotSaleTx,
    AgoraOneshotCancelTx,
    agoraPartialCancelTwo,
    agoraPartialCancelTx,
    agoraPartialBuxBuyTx,
    agoraPartialBuxSellTx,
    SlpNftParentMintTx,
    partialSellBull,
    alpBurnTx,
    alpAgoraListingTx,
    xecxTx,
    invalidXecxTx,
    firmaYieldTx,
    firmaRedeemTx,
    cachetSendToEdjTx,
    edjSendTx,
    edjPayoutTx,
    edjFirmaPayoutTx,
} from 'chronik/fixtures/mocks';
import CashtabState from 'config/CashtabState';
import { MemoryRouter } from 'react-router';
import userEvent from '@testing-library/user-event';

describe('<Tx />', () => {
    it('Incoming XEC-only, avalanche finalized', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...incomingXec.tx, parsed: incomingXec.parsed }}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                    />
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
        expect(screen.getByText('42.00 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We see the avalanche finalized check
        expect(screen.getByTitle('Finalized by Avalanche')).toBeInTheDocument();

        // If we expand the panel, we see the exact XEC amount
        // Expand the panel
        await userEvent.click(screen.getByTitle('tx-received'));
        // Now we see the exact XEC received amount, which is the same when the
        // amount is below 1k XEC
        expect(screen.getByText('42.00 XEC')).toBeInTheDocument();
    });
    it('Incoming XEC-only, not yet finalized by Avalanche', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...incomingXec.tx,
                            parsed: incomingXec.parsed,
                            isFinal: false,
                        }}
                        hashes={[
                            mockParseTxWallet.paths.find(p => p.path === 1899)
                                .hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
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
        expect(screen.getByText('42.00 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We do not see the avalanche finalized check
        expect(
            screen.queryByTitle('Finalized by Avalanche'),
        ).not.toBeInTheDocument();

        // We see two inline-loader elements
        expect(screen.getByTitle('Loading')).toBeInTheDocument();
    });
    it('Incoming XEC no change', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...oneOutputReceivedTx.tx,
                            parsed: oneOutputReceivedTx.parsed,
                        }}
                        hashes={['601efc2aa406fe9eaedd41d2b5d95d1f4db9041d']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
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
        expect(screen.getByText('Apr 26, 2024, 13:38:10')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('456.54M XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$13,696.17')).toBeInTheDocument();

        // We do not see the avalanche finalized check
        expect(
            screen.queryByTitle('Finalized by Avalanche'),
        ).not.toBeInTheDocument();

        // We see the inline-loader elements
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // If we expand the panel, we see the exact XEC amount
        // Expand the panel
        await userEvent.click(screen.getByTitle('tx-received'));
        // Now we see the exact XEC received amount
        expect(screen.getByText('456,538,993.20 XEC')).toBeInTheDocument();
    });
    it('Outgoing XEC-only', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...outgoingXec.tx, parsed: outgoingXec.parsed }}
                        hashes={[
                            mockParseTxWallet.paths.find(p => p.path === 1899)
                                .hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
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
        expect(screen.getByText('-222.00 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.01')).toBeInTheDocument();
    });
    it('Staking reward received by Cashtab wallet', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...stakingRwd.tx, parsed: stakingRwd.parsed }}
                        hashes={[
                            mockParseTxWallet.paths.find(p => p.path === 1899)
                                .hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
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
                        tx={{
                            ...aliasRegistration.tx,
                            parsed: aliasRegistration.parsed,
                        }}
                        hashes={[
                            mockAliasWallet.paths.find(p => p.path === 1899)
                                .hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
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
                            ...invalidAliasRegistration.tx,
                            parsed: invalidAliasRegistration.parsed,
                        }}
                        hashes={[
                            mockAliasWallet.paths.find(p => p.path === 1899)
                                .hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
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
                        tx={{
                            ...incomingEtoken.tx,
                            parsed: incomingEtoken.parsed,
                        }}
                        hashes={[
                            mockParseTxWallet.paths.find(p => p.path === 1899)
                                .hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
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
                        tx={{
                            ...incomingEtoken.tx,
                            parsed: incomingEtoken.parsed,
                        }}
                        hashes={[
                            mockParseTxWallet.paths.find(p => p.path === 1899)
                                .hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{
                            ...outgoingEtoken.tx,
                            parsed: outgoingEtoken.parsed,
                        }}
                        hashes={[
                            mockParseTxWallet.paths.find(p => p.path === 1899)
                                .hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
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
                        tx={{
                            ...outgoingEtoken.tx,
                            parsed: outgoingEtoken.parsed,
                        }}
                        hashes={[
                            mockParseTxWallet.paths.find(p => p.path === 1899)
                                .hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{ ...genesisTx.tx, parsed: genesisTx.parsed }}
                        hashes={[
                            mockParseTxWalletAirdrop.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
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
                        tx={{ ...genesisTx.tx, parsed: genesisTx.parsed }}
                        hashes={[
                            mockParseTxWalletAirdrop.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{
                            ...incomingEtokenNineDecimals.tx,
                            parsed: incomingEtokenNineDecimals.parsed,
                        }}
                        hashes={[
                            mockParseTxWalletAirdrop.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
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
                        tx={{
                            ...incomingEtokenNineDecimals.tx,
                            parsed: incomingEtokenNineDecimals.parsed,
                        }}
                        hashes={[
                            mockParseTxWalletAirdrop.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{
                            ...legacyAirdropTx.tx,
                            parsed: legacyAirdropTx.parsed,
                        }}
                        hashes={[
                            mockParseTxWalletAirdrop.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
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
                        tx={{
                            ...onSpecAirdropTxNoMsg.tx,
                            parsed: onSpecAirdropTxNoMsg.parsed,
                        }}
                        hashes={['2a96944d06700882bbd984761d9c9e4215f2d78e']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockLargeTokenCache },
                        }}
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
        expect(screen.getByText('GRUMPY')).toBeInTheDocument();
        expect(screen.getByText('(GRP)')).toBeInTheDocument();

        // We see airdrop label
        expect(screen.getByText('Airdrop (XEC)')).toBeInTheDocument();

        // We see an info button and can click it for more info
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Airdrop Msg Info',
            }),
        );
        expect(
            screen.getByText('Beware of scams in links!'),
        ).toBeInTheDocument();

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
                            ...offSpecAirdropTx.tx,
                            parsed: offSpecAirdropTx.parsed,
                        }}
                        hashes={[offSpecAirdropTx.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockLargeTokenCache },
                        }}
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
                        tx={{
                            ...outgoingEncryptedMsg.tx,
                            parsed: outgoingEncryptedMsg.parsed,
                        }}
                        hashes={[
                            mockParseTxWalletEncryptedMsg.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('-12.00 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // Encrypted msg app action
        // We see the encrypted msg icon
        expect(screen.getByTitle('tx-encrypted-msg')).toBeInTheDocument();

        // We see expected text msg
        expect(
            screen.getByText('Cashtab Encrypted (deprecated)'),
        ).toBeInTheDocument();
    });
    it('Received encrypted msg', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...incomingEncryptedMsg.tx,
                            parsed: incomingEncryptedMsg.parsed,
                        }}
                        hashes={[
                            mockParseTxWalletEncryptedMsg.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('11.00 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // Encrypted msg app action
        // We see the encrypted msg icon
        expect(screen.getByTitle('tx-encrypted-msg')).toBeInTheDocument();

        // We see expected text msg
        expect(
            screen.getByText('Cashtab Encrypted (deprecated)'),
        ).toBeInTheDocument();
    });
    it('Burn slpv1 fungible token', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...tokenBurn.tx, parsed: tokenBurn.parsed }}
                        hashes={[
                            mockParseTxWalletAirdrop.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
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
                        tx={{ ...tokenBurn.tx, parsed: tokenBurn.parsed }}
                        hashes={[
                            mockParseTxWalletAirdrop.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{
                            ...tokenBurnDecimals.tx,
                            parsed: tokenBurnDecimals.parsed,
                        }}
                        hashes={[
                            mockParseTxWalletAirdrop.paths.find(
                                p => p.path === 1899,
                            ).hash,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: { tokens: mockParseTxTokenCache },
                        }}
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
                        tx={{ ...swapTx.tx, parsed: swapTx.parsed }}
                        hashes={['93472d56ba91581ed473225a765dd14a2db5d9d8']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('Apr 8, 2024, 00:18:59')).toBeInTheDocument();

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
                        tx={{
                            ...PayButtonNoDataYesNonce.tx,
                            parsed: PayButtonNoDataYesNonce.parsed,
                        }}
                        hashes={['f66d2760b20dc7a47d9cf1a2b2f49749bf7093f6']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('18.00 XEC')).toBeInTheDocument();

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
                        tx={{
                            ...PayButtonYesDataYesNonce.tx,
                            parsed: PayButtonYesDataYesNonce.parsed,
                        }}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{
                            ...PayButtonEmpty.tx,
                            parsed: PayButtonEmpty.parsed,
                        }}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{
                            ...PayButtonYesDataNoNonce.tx,
                            parsed: PayButtonYesDataNoNonce.parsed,
                        }}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{
                            ...PayButtonOffSpec.tx,
                            parsed: PayButtonOffSpec.parsed,
                        }}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('Invalid PayButton')).toBeInTheDocument();
    });
    it('Unsupported version PayButton tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...PayButtonBadVersion.tx,
                            parsed: PayButtonBadVersion.parsed,
                        }}
                        hashes={['e628f12f1e911c9f20ec2eeb1847e3a2ffad5fcc']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('Invalid PayButton')).toBeInTheDocument();
    });
    it('Received NFToa Authentication TX (Proof of Access, with nonce)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...NFToaAuthYesNonce.tx,
                            parsed: NFToaAuthYesNonce.parsed,
                        }}
                        hashes={['c73d119dede21aca5b3f1d959634bb6fee878996']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                </ThemeProvider>
            </MemoryRouter>,
        );

        // Icon (received)
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // Label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // Amount
        expect(screen.getByText('5.50 XEC')).toBeInTheDocument();
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // NFToa logo
        expect(screen.getByTitle('tx-nftoa')).toBeInTheDocument();

        // Nonce
        expect(screen.getByText('eb0c601b84975437')).toBeInTheDocument();

        // App action
        expect(screen.getByText('Login to Gaudio App')).toBeInTheDocument();
    });
    it('Received NFToa Message TX (without nonce)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...NFToaMsgNoNonce.tx,
                            parsed: NFToaMsgNoNonce.parsed,
                        }}
                        hashes={['c73d119dede21aca5b3f1d959634bb6fee878996']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                </ThemeProvider>
            </MemoryRouter>,
        );

        // Icon (received)
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // Label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // Amount
        expect(screen.getByText('5.50 XEC')).toBeInTheDocument();
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // NFToa logo
        expect(screen.getByTitle('tx-nftoa')).toBeInTheDocument();

        // App action
        expect(screen.getByText('Hello World from NFToa')).toBeInTheDocument();
    });
    it('Off-spec NFToa TX (invalid format)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...NFToaOffSpec.tx,
                            parsed: NFToaOffSpec.parsed,
                        }}
                        hashes={['c73d119dede21aca5b3f1d959634bb6fee878996']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                </ThemeProvider>
            </MemoryRouter>,
        );

        // Icon (received)
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // Label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // Amount
        expect(screen.getByText('5.50 XEC')).toBeInTheDocument();
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // NFToa logo
        expect(screen.getByTitle('tx-nftoa')).toBeInTheDocument();

        // App action
        expect(screen.getByText('Invalid NFToa')).toBeInTheDocument();
    });
    it('eCash chat tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...MsgFromEcashChat.tx,
                            parsed: MsgFromEcashChat.parsed,
                        }}
                        hashes={['0b7d35fda03544a08e65464d54cfae4257eb6db7']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('10.00 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // eCash chat msg app action
        // We see the eCash Chat logo
        expect(screen.getByTitle('tx-chat')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('eCashChat')).toBeInTheDocument();

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
                            ...offSpecEcashChat.tx,
                            parsed: offSpecEcashChat.parsed,
                        }}
                        hashes={['0b7d35fda03544a08e65464d54cfae4257eb6db7']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('10.00 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // eCash chat msg app action
        // We see the eCash Chat logo
        expect(screen.getByTitle('tx-chat')).toBeInTheDocument();

        // We see expected protocol label
        expect(screen.getByText('Invalid eCashChat')).toBeInTheDocument();
    });
    it('slpv1 fungible token MINT', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...SlpV1Mint.tx, parsed: SlpV1Mint.parsed }}
                        hashes={['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: mockTxHistorySupportingTokenCache,
                            },
                        }}
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
                        tx={{ ...SlpV1Mint.tx, parsed: SlpV1Mint.parsed }}
                        hashes={['95e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{
                            ...MsgFromElectrum.tx,
                            parsed: MsgFromElectrum.parsed,
                        }}
                        hashes={['4e532257c01b310b3b5c1fd947c79a72addf8523']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('6.00 XEC')).toBeInTheDocument();

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
                        tx={{ ...unknownAppTx.tx, parsed: unknownAppTx.parsed }}
                        hashes={['d18b7b500f17c5db64303fec630f9dbb85aa9596']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
                        tx={{ ...AlpTx.tx, parsed: AlpTx.parsed }}
                        hashes={['dee50f576362377dd2f031453c0bb09009acaf81']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: mockTxHistorySupportingTokenCache,
                            },
                        }}
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
                        tx={{ ...AlpTx.tx, parsed: AlpTx.parsed }}
                        hashes={['dee50f576362377dd2f031453c0bb09009acaf81']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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

        // We see expected Token Send action icon
        expect(screen.getByTitle('Token Send')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(
                'icon for cdcdcdcdcdc9dda4c92bb1145aa84945c024346ea66fd4b699e344e45df2e145',
            ),
        ).toBeInTheDocument();

        // We see the expected token action text for a received ALP fungible token tx
        expect(screen.getByText('Received')).toBeInTheDocument();
    });
    it('Received Cashtab message', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...CashtabMsg.tx, parsed: CashtabMsg.parsed }}
                        hashes={[CashtabMsg.tx.outputs[1].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('5.50 XEC')).toBeInTheDocument();

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
                            ...offSpecCashtabMsg.tx,
                            parsed: offSpecCashtabMsg.parsed,
                        }}
                        hashes={[offSpecCashtabMsg.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('5.50 XEC')).toBeInTheDocument();

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
                        tx={{
                            ...SlpNftParentFanTx.tx,
                            parsed: SlpNftParentFanTx.parsed,
                        }}
                        hashes={[SlpNftParentFanTx.tx.outputs[1].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(SlpNftParentFanTx.cache),
                            },
                        }}
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
                        tx={{ ...SlpNftMint.tx, parsed: SlpNftMint.parsed }}
                        hashes={[SlpNftMint.tx.outputs[1].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(SlpNftMint.cache),
                            },
                        }}
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

        // We see the token name
        expect(screen.getByText('Wu Fang Choi')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(WFC)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Minted 1 WFC')).toBeInTheDocument();

        // We see a second token action for burning the NFT Mint Input
        expect(screen.getByTitle('tx-token-burn')).toBeInTheDocument();
        expect(screen.getByText('Burned 1')).toBeInTheDocument();
    });
    it('Genesis tx of an SLP1 Parent Token (i.e. "Creating an NFT Collection")', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...SlpParentGenesisTxMock.tx,
                            parsed: SlpParentGenesisTxMock.parsed,
                        }}
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

        // We see the token name
        expect(screen.getByText('The Heisman')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(HSM)')).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(screen.getByText('Created 89 HSM')).toBeInTheDocument();
    });
    it('Sent paywall payment tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...paywallPaymentTx.tx,
                            parsed: paywallPaymentTx.parsed,
                        }}
                        hashes={[paywallPaymentTx.tx.outputs[1].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We render the timestamp
        expect(screen.getByText('May 23, 2024, 14:33:47')).toBeInTheDocument();

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the paywall description
        expect(screen.getByText('Paywall Article')).toBeInTheDocument();

        // We see expected explorer link generated
        expect(screen.getByText('Paywall Article')).toHaveAttribute(
            'href',
            'https://www.ecashchat.com/?sharedArticleTxid=4d7a62ebb7f06fd7a86f861280853e6fce3c117c73598fe284190260abd5ddc4',
        );
    });
    it('Invalid paywall payment tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...offSpecPaywallPaymentTx.tx,
                            parsed: offSpecPaywallPaymentTx.parsed,
                        }}
                        hashes={[offSpecPaywallPaymentTx.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We render the timestamp
        expect(screen.getByText('May 23, 2024, 14:33:47')).toBeInTheDocument();

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the invalid paywall tx description
        expect(screen.getByText('Invalid Paywall')).toBeInTheDocument();
    });
    it('Sent eCashChat article reply tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...eCashChatArticleReplyTx.tx,
                            parsed: eCashChatArticleReplyTx.parsed,
                        }}
                        hashes={[
                            eCashChatArticleReplyTx.tx.outputs[2].outputScript,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the article reply description
        expect(screen.getByText('eCash Chat - Reply to')).toBeInTheDocument();

        // We see expected explorer link generated
        expect(screen.getByText('article')).toHaveAttribute(
            'href',
            'https://www.ecashchat.com/?sharedArticleTxid=fc1bec473c0c8de408b8587ead6d31ad1d8854835c19947488fa7b30b7992267',
        );
    });
    it('Invalid eCashChat article reply tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...offSpecEcashChatArticleReplyTx.tx,
                            parsed: offSpecEcashChatArticleReplyTx.parsed,
                        }}
                        hashes={[
                            eCashChatArticleReplyTx.tx.outputs[2].outputScript,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the invalid article tx description
        expect(
            screen.getByText('Invalid eCashChat Article'),
        ).toBeInTheDocument();
    });
    it('Sent eCashChat article tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...eCashChatArticleTx.tx,
                            parsed: eCashChatArticleTx.parsed,
                        }}
                        hashes={[eCashChatArticleTx.tx.outputs[2].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the article tx description
        expect(
            screen.getByText('eCash Chat article created'),
        ).toBeInTheDocument();
    });
    it('Invalid eCashChat article tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...offSpecEcashChatArticleTx.tx,
                            parsed: offSpecEcashChatArticleTx.parsed,
                        }}
                        hashes={[eCashChatArticleTx.tx.outputs[2].outputScript]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the invalid article tx description
        expect(
            screen.getByText('Invalid eCashChat Article'),
        ).toBeInTheDocument();
    });
    it('Sent eCashChat authentication tx', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...eCashChatAuthenticationTx.tx,
                            parsed: eCashChatAuthenticationTx.parsed,
                        }}
                        hashes={[eCashChatAuthenticationTx.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
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
        expect(screen.getByText('Aug 11, 2024, 10:36:00')).toBeInTheDocument();

        // We see the formatted XEC amount
        expect(screen.getByText('-5.50 XEC')).toBeInTheDocument();

        // We see the formatted fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // We see the article tx description
        expect(screen.getByText('Auth')).toBeInTheDocument();
    });
    it('Ad setup tx for an SLP1 NFT Agora offer (cached)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...agoraAdSetupTxSlpNft.tx,
                            parsed: agoraAdSetupTxSlpNft.parsed,
                        }}
                        hashes={[
                            agoraAdSetupTxSlpNft.tx.inputs[0].outputScript,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(agoraAdSetupTxSlpNft.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 22, 2024, 21:24:27')).toBeInTheDocument();

        // We see the expected send amount
        expect(screen.getByText('-8.60 XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            ),
        ).toBeInTheDocument();

        // We see the Agora Offer icon
        expect(screen.getByTitle('Agora Offer')).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('Nile Kinnick')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(NK)')).toBeInTheDocument();

        // We see the expected token action for listing this NFT
        expect(screen.getByText('Listed 1 NK')).toBeInTheDocument();
    });
    it('Ad setup tx for an SLP1 NFT Agora offer (uncached)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...agoraAdSetupTxSlpNft.tx,
                            parsed: agoraAdSetupTxSlpNft.parsed,
                        }}
                        hashes={[
                            agoraAdSetupTxSlpNft.tx.inputs[0].outputScript,
                        ]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 22, 2024, 21:24:27')).toBeInTheDocument();

        // We see the expected send amount
        expect(screen.getByText('-8.60 XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            ),
        ).toBeInTheDocument();

        // We see the Agora Offer icon
        expect(screen.getByTitle('Agora Offer')).toBeInTheDocument();

        // We see SEND but not the token name (uncached)
        expect(screen.getByText('Agora Offer')).toBeInTheDocument();

        // We do not see the token ticker in parenthesis in the summary column
        expect(screen.queryByText('(NK)')).not.toBeInTheDocument();

        // We see the expected token action text for a listed SLPv1 fungible token tx, but no quantity
        expect(screen.getByText('Listed')).toBeInTheDocument();
    });
    it('Agora one-shot buy tx (token info available in cache)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...agoraOneshotBuyTx.tx,
                            parsed: agoraOneshotBuyTx.parsed,
                        }}
                        hashes={[agoraOneshotBuyTx.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(agoraOneshotSaleTx.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 23, 2024, 19:57:57')).toBeInTheDocument();

        // We see the expected send amount
        expect(screen.getByText('-720.67k XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('-$21.62')).toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            ),
        ).toBeInTheDocument();

        // We see the Agora Purchase icon
        expect(screen.getByTitle('Agora Purchase')).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('Nile Kinnick')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(NK)')).toBeInTheDocument();

        // We see the expected token action for buying this NFT
        expect(screen.getByText('Bought 1 NK')).toBeInTheDocument();
    });
    it('Agora one-shot buy tx (uncached)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...agoraOneshotBuyTx.tx,
                            parsed: agoraOneshotBuyTx.parsed,
                        }}
                        hashes={[agoraOneshotBuyTx.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 23, 2024, 19:57:57')).toBeInTheDocument();

        // We see the expected send amount
        expect(screen.getByText('-720.67k XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('-$21.62')).toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            ),
        ).toBeInTheDocument();

        // We see the Agora Purchase icon
        expect(screen.getByTitle('Agora Purchase')).toBeInTheDocument();
    });
    it('Agora one-shot sell tx (token info available in cache)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...agoraOneshotSaleTx.tx,
                            parsed: agoraOneshotSaleTx.parsed,
                        }}
                        // See mock
                        // Buy from this wallet
                        // You can't reference the usual 0 input outputScript bc it's an agora p2sh
                        hashes={[agoraOneshotSaleTx.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(agoraOneshotSaleTx.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 23, 2024, 19:57:57')).toBeInTheDocument();

        // We see the expected send amount
        expect(screen.getByText('720.67k XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('$21.62')).toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            ),
        ).toBeInTheDocument();

        // We see the Agora Purchase icon
        expect(screen.getByTitle('Agora Sale')).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('Nile Kinnick')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(NK)')).toBeInTheDocument();

        // We see the expected token action for selling this NFT
        expect(screen.getByText('Sold 1 NK')).toBeInTheDocument();
    });
    it('Agora one-shot sell tx (uncached)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...agoraOneshotSaleTx.tx,
                            parsed: agoraOneshotSaleTx.parsed,
                        }}
                        // See mock
                        // Buy from this wallet
                        // You can't reference the usual 0 input outputScript bc it's an agora p2sh
                        hashes={[agoraOneshotSaleTx.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 23, 2024, 19:57:57')).toBeInTheDocument();

        // We see the expected send amount
        expect(screen.getByText('720.67k XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('$21.62')).toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            ),
        ).toBeInTheDocument();

        // We see the Agora Purchase icon
        expect(screen.getByTitle('Agora Sale')).toBeInTheDocument();
    });
    it('Agora one-shot cancel tx (token info available in cache)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...AgoraOneshotCancelTx.tx,
                            parsed: AgoraOneshotCancelTx.parsed,
                        }}
                        // See mock
                        // Buy from this wallet
                        // You can't reference the usual 0 input outputScript bc it's an agora p2sh
                        hashes={['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(AgoraOneshotCancelTx.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 23, 2024, 21:52:26')).toBeInTheDocument();

        // We see the expected sent to self amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            ),
        ).toBeInTheDocument();

        // We see the Agora Cancel icon
        expect(screen.getByTitle('Agora Cancel')).toBeInTheDocument();

        // We see the token name
        expect(screen.getByText('Nile Kinnick')).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(screen.getByText('(NK)')).toBeInTheDocument();

        // We see the expected token action for canceling this NFT listing
        expect(screen.getByText('Canceled offer of 1 NK')).toBeInTheDocument();
    });
    it('Agora one-shot cancel tx (uncached)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...AgoraOneshotCancelTx.tx,
                            parsed: AgoraOneshotCancelTx.parsed,
                        }}
                        // See mock
                        // Buy from this wallet
                        // You can't reference the usual 0 input outputScript bc it's an agora p2sh
                        hashes={['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 23, 2024, 21:52:26')).toBeInTheDocument();

        // We see the expected sent to self amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the NFT associated image
        expect(
            screen.getByAltText(
                'icon for f09ec0e8e5f37ab8aebe8e701a476b6f2085f8d9ea10ddc8ef8d64e7ad377df3',
            ),
        ).toBeInTheDocument();

        // We see the Agora Cancel icon
        expect(screen.getByTitle('Agora Cancel')).toBeInTheDocument();
    });
    it('Agora partial cancel tx (token info available in cache)', async () => {
        const thisMock = agoraPartialCancelTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={['7847fe7070bec8567b3e810f543f2f80cc3e03be']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(thisMock.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 24, 2024, 17:05:38')).toBeInTheDocument();

        // We see the expected sent to self amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Sale icon
        expect(screen.getByTitle('Agora Cancel')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText(thisMock.cache[0][1].genesisInfo.tokenName),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(
            screen.getByText(
                `(${thisMock.cache[0][1].genesisInfo.tokenTicker})`,
            ),
        ).toBeInTheDocument();

        // We see the expected token action
        expect(
            screen.getByText(
                `Canceled offer of 855.738679296 ${thisMock.cache[0][1].genesisInfo.tokenTicker}`,
            ),
        ).toBeInTheDocument();
    });
    it('Agora partial cancel tx (uncached)', async () => {
        const thisMock = agoraPartialCancelTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={['7847fe7070bec8567b3e810f543f2f80cc3e03be']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 24, 2024, 17:05:38')).toBeInTheDocument();

        // We see the expected send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Cancel icon
        expect(screen.getByTitle('Agora Cancel')).toBeInTheDocument();
    });
    it('Agora partial bux buy tx renders correct bought amount (token info available in cache)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...agoraPartialBuxBuyTx.tx,
                            parsed: agoraPartialBuxBuyTx.parsed,
                        }}
                        hashes={['76458db0ed96fe9863fc1ccec9fa2cfab884b0f6']}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(agoraPartialBuxBuyTx.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // In this case, it's a partial buy, so it also recreates the offer
        expect(screen.getByText(/and 1 other/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 24, 2024, 23:21:00')).toBeInTheDocument();

        // We see the purchase price in XEC and fiat
        expect(screen.getByText('-431.45k XEC')).toBeInTheDocument();
        expect(screen.getByText('-$12.94')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${agoraPartialBuxBuyTx.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Sale icon
        expect(screen.getByTitle('Agora Purchase')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText(
                agoraPartialBuxBuyTx.cache[0][1].genesisInfo.tokenName,
            ),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(
            screen.getByText(
                `(${agoraPartialBuxBuyTx.cache[0][1].genesisInfo.tokenTicker})`,
            ),
        ).toBeInTheDocument();

        // We see the expected token action
        const BOUGHT_AMOUNT = '14.0667';
        expect(
            screen.getByText(
                `Bought ${BOUGHT_AMOUNT} ${agoraPartialBuxBuyTx.cache[0][1].genesisInfo.tokenTicker}`,
            ),
        ).toBeInTheDocument();
    });
    it('Agora partial bux buy tx renders (uncached)', async () => {
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...agoraPartialBuxBuyTx.tx,
                            parsed: agoraPartialBuxBuyTx.parsed,
                        }}
                        hashes={[agoraPartialBuxBuyTx.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(
            screen.getByText(
                `${new Date(
                    parseInt(`${agoraPartialBuxBuyTx.tx.timeFirstSeen}000`),
                ).toLocaleTimeString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour12: false,
                })}`,
            ),
        ).toBeInTheDocument();

        // We see the purchase price in XEC and fiat
        expect(screen.getByText('-431.45k XEC')).toBeInTheDocument();
        expect(screen.getByText('-$12.94')).toBeInTheDocument();

        expect(
            screen.getByAltText(`icon for ${agoraPartialBuxBuyTx.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Purchase icon
        expect(screen.getByTitle('Agora Purchase')).toBeInTheDocument();
    });
    it('Agora partial bux sell tx renders correct bought amount (token info available in cache)', async () => {
        // TODO if this is supposed to be a sell tx, we need to make the SELL version of it with the right SELL hash in mocks
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...agoraPartialBuxSellTx.tx,
                            parsed: agoraPartialBuxSellTx.parsed,
                        }}
                        // the seller is paid at outputs[1]
                        hashes={[agoraPartialBuxSellTx.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(agoraPartialBuxBuyTx.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Oct 24, 2024, 23:21:00')).toBeInTheDocument();

        // We see the purchase price in XEC and fiat, as sale earnings
        expect(screen.getByText('431.45k XEC')).toBeInTheDocument();
        expect(screen.getByText('$12.94')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${agoraPartialBuxBuyTx.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Sale icon
        expect(screen.getByTitle('Agora Sale')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText(
                agoraPartialBuxBuyTx.cache[0][1].genesisInfo.tokenName,
            ),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(
            screen.getByText(
                `(${agoraPartialBuxBuyTx.cache[0][1].genesisInfo.tokenTicker})`,
            ),
        ).toBeInTheDocument();

        // We see the expected token action
        const SOLD_AMOUNT = '14.0667';
        expect(
            screen.getByText(
                `Sold ${SOLD_AMOUNT} ${agoraPartialBuxBuyTx.cache[0][1].genesisInfo.tokenTicker}`,
            ),
        ).toBeInTheDocument();
    });
    it('Another agora partial sell tx renders correct sell amount (token info available in cache)', async () => {
        const thisMock = partialSellBull;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{
                            ...thisMock.tx,
                            parsed: thisMock.parsed,
                        }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(thisMock.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Received icon for the XEC action
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Nov 6, 2024, 02:33:04')).toBeInTheDocument();

        // We see the purchase price in XEC and fiat, as sale earnings
        expect(screen.getByText('28.13k XEC')).toBeInTheDocument();
        expect(screen.getByText('$0.84')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Sale icon
        expect(screen.getByTitle('Agora Sale')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText(thisMock.cache[0][1].genesisInfo.tokenName),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(
            screen.getByText(
                `(${thisMock.cache[0][1].genesisInfo.tokenTicker})`,
            ),
        ).toBeInTheDocument();

        // We see the expected token action
        const SOLD_AMOUNT = '375';
        expect(
            screen.getByText(
                `Sold ${SOLD_AMOUNT} ${thisMock.cache[0][1].genesisInfo.tokenTicker}`,
            ),
        ).toBeInTheDocument();
    });
    it('Agora partial CTD cancel tx renders correct bought amount (token info available in cache)', async () => {
        const thisMock = agoraPartialCancelTwo;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(thisMock.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon for the XEC action
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(
            screen.getByText(
                `${new Date(
                    parseInt(`${thisMock.tx.timeFirstSeen}000`),
                ).toLocaleTimeString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour12: false,
                })}`,
            ),
        ).toBeInTheDocument();

        // We see a null amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Sale icon
        expect(screen.getByTitle('Agora Cancel')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText(thisMock.cache[0][1].genesisInfo.tokenName),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(
            screen.getByText(
                `(${thisMock.cache[0][1].genesisInfo.tokenTicker})`,
            ),
        ).toBeInTheDocument();

        // We see the expected token action
        const AMOUNT = '495';
        expect(
            screen.getByText(
                `Canceled offer of ${AMOUNT} ${thisMock.cache[0][1].genesisInfo.tokenTicker}`,
            ),
        ).toBeInTheDocument();
    });
    it('Agora partial CTD cancel tx renders (uncached)', async () => {
        const thisMock = agoraPartialCancelTwo;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon for the XEC action
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see expected label
        // Agora cancel txs are arguably XEC send
        // But we are getting satoshis back from the p2sh we created earlier with a send
        expect(screen.getByText(/Sent to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(
            screen.getByText(
                `${new Date(
                    parseInt(`${thisMock.tx.timeFirstSeen}000`),
                ).toLocaleTimeString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour12: false,
                })}`,
            ),
        ).toBeInTheDocument();

        // We see a null amount
        expect(screen.getByText('-')).toBeInTheDocument();

        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Sale icon
        expect(screen.getByTitle('Agora Cancel')).toBeInTheDocument();
    });
    it('Parse a mint tx for SLP NFT parent distinct from fan-out tx (token info available in cache)', async () => {
        const thisMock = SlpNftParentMintTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(thisMock.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see the tx received label
        expect(screen.getByText(/to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(
            screen.getByText(
                `${new Date(
                    parseInt(`${thisMock.tx.timeFirstSeen}000`),
                ).toLocaleTimeString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour12: false,
                })}`,
            ),
        ).toBeInTheDocument();

        // We see a null amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We DO NOT see the Fan Out icon
        expect(screen.queryByTitle('Fan Out')).not.toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText(thisMock.cache[0][1].genesisInfo.tokenName),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(
            screen.getByText(
                `(${thisMock.cache[0][1].genesisInfo.tokenTicker})`,
            ),
        ).toBeInTheDocument();

        // We see the expected token action
        expect(
            screen.getByText(
                `Minted 1 ${thisMock.cache[0][1].genesisInfo.tokenTicker}`,
            ),
        ).toBeInTheDocument();
    });
    it('Parse a mint tx for SLP NFT parent distinct from fan-out tx (uncached)', async () => {
        const thisMock = SlpNftParentMintTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={new CashtabState()}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Self Send icon
        expect(screen.getByTitle('Self Send')).toBeInTheDocument();

        // We see the tx received label
        expect(screen.getByText(/to self/)).toBeInTheDocument();

        // We render the timestamp
        expect(
            screen.getByText(
                `${new Date(
                    parseInt(`${thisMock.tx.timeFirstSeen}000`),
                ).toLocaleTimeString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour12: false,
                })}`,
            ),
        ).toBeInTheDocument();

        // We see a null amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We DO NOT see the Fan Out icon
        expect(screen.queryByTitle('Fan Out')).not.toBeInTheDocument();

        // We see the expected token action without qty or token ticker
        expect(screen.getByText(`Minted`)).toBeInTheDocument();
    });
    it('ALP burn tx', async () => {
        const thisMock = alpBurnTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(thisMock.cache),
                            },
                        }}
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
        expect(screen.getByText('Nov 23, 2024, 15:09:21')).toBeInTheDocument();

        // We see the expected self-send amount
        expect(screen.getByText('-')).toBeInTheDocument();

        // We do not see the a fiat amount
        expect(screen.queryByText('$')).not.toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the token burn icon
        expect(screen.getByTitle('tx-token-burn')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText(thisMock.cache[0][1].genesisInfo.tokenName),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(
            screen.getByText(
                `(${thisMock.cache[0][1].genesisInfo.tokenTicker})`,
            ),
        ).toBeInTheDocument();

        // We see the expected token action text for a received SLPv1 fungible token tx
        expect(
            screen.getByText(
                `Burned 1 ${thisMock.cache[0][1].genesisInfo.tokenTicker}`,
            ),
        ).toBeInTheDocument();
    });
    it('Ad setup tx for an ALP Agora offer (cached)', async () => {
        const thisMock = alpAgoraListingTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(thisMock.cache),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the Sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Nov 26, 2024, 17:40:01')).toBeInTheDocument();

        // We see the expected send amount
        expect(screen.getByText('-5.46 XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Offer icon
        expect(screen.getByTitle('Agora Offer')).toBeInTheDocument();

        // We see the token name
        expect(
            screen.getByText(thisMock.cache[0][1].genesisInfo.tokenName),
        ).toBeInTheDocument();

        // We see the token ticker in parenthesis in the summary column
        expect(
            screen.getByText(
                `(${thisMock.cache[0][1].genesisInfo.tokenTicker})`,
            ),
        ).toBeInTheDocument();

        // We see the expected token action for listing this NFT
        expect(
            screen.getByText(
                `Listed 99,106 ${thisMock.cache[0][1].genesisInfo.tokenTicker}`,
            ),
        ).toBeInTheDocument();
    });
    it('Ad setup tx for an ALP Agora offer (uncached)', async () => {
        const thisMock = alpAgoraListingTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see a conventional tx-sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Nov 26, 2024, 17:40:01')).toBeInTheDocument();

        // We see the expected send amount
        expect(screen.getByText('-5.46 XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // We see the token icon
        expect(
            screen.getByAltText(`icon for ${thisMock.cache[0][0]}`),
        ).toBeInTheDocument();

        // We see the Agora Offer icon for the token action
        expect(screen.getByTitle('Agora Offer')).toBeInTheDocument();

        // We see 'Agora Offer' as the rendered tx type but not the token name (uncached)
        expect(screen.getByText('Agora Offer')).toBeInTheDocument();

        // We do not see the token ticker in parenthesis in the summary column
        expect(
            screen.queryByText(
                `(${thisMock.cache[0][1].genesisInfo.tokenTicker})`,
            ),
        ).not.toBeInTheDocument();

        // We see the expected token action text for a listed ALP fungible token tx, but no quantity
        expect(screen.getByText('Listed')).toBeInTheDocument();
    });
    it('Valid XECX tx', async () => {
        const thisMock = xecxTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see a conventional tx-received icon for the XEC action
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Dec 27, 2024, 00:00:01')).toBeInTheDocument();

        // We see the expected received amount
        expect(screen.getByText('312.5k XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('$9.38')).toBeInTheDocument();

        // We see XECX icon
        expect(screen.getByAltText(`XECX reward`)).toBeInTheDocument();

        // We see the parsed App Action
        expect(
            screen.getByText(
                /XEC staking reward to all XECX holders with balance/,
            ),
        ).toBeInTheDocument();

        // We see the parsed min eligible balance
        expect(screen.getByText(/34,580.56 XECX/)).toBeInTheDocument();
    });
    it('Invalid XECX tx', async () => {
        const thisMock = invalidXecxTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see a conventional tx-received icon for the XEC action
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Dec 27, 2024, 00:00:01')).toBeInTheDocument();

        // We see the expected received amount
        expect(screen.getByText('312.5k XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('$9.38')).toBeInTheDocument();

        // We see XECX icon
        expect(screen.getByAltText(`XECX reward`)).toBeInTheDocument();

        // We see the invalid App Action
        expect(screen.getByText('Invalid XECX EMPP')).toBeInTheDocument();
    });
    it('Outgoing FIRMA yield payment', async () => {
        const thisMock = firmaYieldTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsedSend }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see a conventional tx-sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Feb 25, 2025, 23:00:04')).toBeInTheDocument();

        // We see the expected sent amount
        expect(screen.getByText('-65.52 XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // We see Firma icon
        expect(screen.getByAltText(`Firma reward`)).toBeInTheDocument();

        // We see Firma yield app action
        expect(screen.getByText(`Firma yield payment`)).toBeInTheDocument();
    });
    it('Incoming FIRMA yield payment', async () => {
        const thisMock = firmaYieldTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsedReceive }}
                        hashes={[thisMock.receivingHashHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see a conventional tx-received icon for the XEC action
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Received from/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('Feb 25, 2025, 23:00:04')).toBeInTheDocument();

        // We see the expected sent amount
        expect(screen.getByText('5.46 XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('$0.00')).toBeInTheDocument();

        // We see Firma icon
        expect(screen.getByAltText(`Firma reward`)).toBeInTheDocument();

        // We see Firma yield app action
        expect(screen.getByText(`Firma yield payment`)).toBeInTheDocument();
    });
    it('Outgoing FIRMA-USDT conversion tx', async () => {
        const thisMock = firmaRedeemTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsedSend }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                    ,
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see a conventional tx-sent icon for the XEC action
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see expected label
        expect(screen.getByText(/Sent to/)).toBeInTheDocument();

        // We render the timestamp
        expect(screen.getByText('May 13, 2025, 20:56:03')).toBeInTheDocument();

        // We see the expected sent amount
        expect(screen.getByText('-5.46 XEC')).toBeInTheDocument();

        // We see the a fiat amount
        expect(screen.getByText('-$0.00')).toBeInTheDocument();

        // We see Firma icon
        expect(screen.getByAltText(`Firma reward`)).toBeInTheDocument();

        // We see the USDT icon
        expect(screen.getByAltText(`USDT Tether logo`)).toBeInTheDocument();

        // We see the SOL logo
        expect(screen.getByAltText(`SOL logo`)).toBeInTheDocument();

        // We see Firma redeem app action
        expect(screen.getByText(`Firma USDT conversion`)).toBeInTheDocument();
    });
    it('CACHET sent to EverydayJackpot (free play)', () => {
        const thisMock = cachetSendToEdjTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx-sent icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see the EverydayJackpot icon
        expect(screen.getByTitle('everydayjackpot.com')).toBeInTheDocument();

        // We see the free play message
        expect(
            screen.getByText('everydayjackpot.com - free play'),
        ).toBeInTheDocument();
    });
    it('EDJ sent to EverydayJackpot (EDJ Play)', () => {
        const thisMock = edjSendTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.sendingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx-sent icon
        expect(screen.getByTitle('tx-sent')).toBeInTheDocument();

        // We see the EverydayJackpot icon
        expect(screen.getByTitle('everydayjackpot.com')).toBeInTheDocument();

        // We see the EDJ Play message
        expect(
            screen.getByText('everydayjackpot.com - EDJ Play'),
        ).toBeInTheDocument();
    });
    it('EDJ received from EverydayJackpot (EDJ payout)', () => {
        const thisMock = edjPayoutTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.receivingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx-received icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the EverydayJackpot icon
        expect(screen.getByTitle('everydayjackpot.com')).toBeInTheDocument();

        // We see the EDJ payout message
        expect(
            screen.getByText('everydayjackpot.com - EDJ payout'),
        ).toBeInTheDocument();
    });
    it('FIRMA received from EverydayJackpot (EDJ.com payout with trophy)', () => {
        const thisMock = edjFirmaPayoutTx;
        render(
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <Tx
                        tx={{ ...thisMock.tx, parsed: thisMock.parsed }}
                        hashes={[thisMock.receivingHash]}
                        fiatPrice={0.00003}
                        fiatCurrency="usd"
                        cashtabState={{
                            ...new CashtabState(),
                            cashtabCache: {
                                tokens: new Map(),
                            },
                        }}
                    />
                </ThemeProvider>
            </MemoryRouter>,
        );

        // We see the tx-received icon
        expect(screen.getByTitle('tx-received')).toBeInTheDocument();

        // We see the EverydayJackpot Winner label (trophy payout)
        expect(screen.getByText('EverydayJackpot Winner')).toBeInTheDocument();

        // We see the trophy payout details
        expect(screen.getByText(/103 entries/)).toBeInTheDocument();
        expect(screen.getByText(/\$14\.60 pot/)).toBeInTheDocument();
        expect(screen.getByText(/1\.37% odds/)).toBeInTheDocument();
        expect(screen.getByText(/Winning bet:/)).toBeInTheDocument();
    });
});
