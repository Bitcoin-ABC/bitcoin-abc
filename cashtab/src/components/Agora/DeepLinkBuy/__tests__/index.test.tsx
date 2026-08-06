// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import * as localForage from 'localforage';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import {
    MemoryRouter,
    Route,
    Routes,
    useParams,
    useSearchParams,
} from 'react-router';
import {
    agoraPartialAlphaWallet,
    agoraPartialBetaMoreBalanceWallet,
    agoraOfferCachetAlphaOne,
    agoraOfferCachetAlphaTwo,
    agoraOfferCachetAffordable,
    cachetCacheMocks,
    bullCacheMocks,
    SettingsUsd,
} from 'components/Agora/fixtures/mocks';
import { ChronikClient } from 'chronik-client';
import { Ecc } from 'ecash-lib';
import { Agora } from 'ecash-agora';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../../../modules/mock-chronik-client';
import DeepLinkBuy, { DeepLinkBuyProps } from 'components/Agora/DeepLinkBuy';
import { ToastContainer } from 'react-toastify';
import { CashtabTheme } from 'assets/styles/theme';
import { WalletProvider } from 'wallet/context';
import { mockPrice, SupportedCashtabStorageKeys, prepareContext } from 'test';
import { SUCCESS_MODAL_DURATION_MS } from 'components/Send/styled';

const CACHET_TOKEN_ID = cachetCacheMocks.token.tokenId;

const waitForContext = async () => {
    await screen.findByTitle('Loading', {}, { timeout: 3000 });
};

interface DeepLinkBuyTestWrapperProps extends Omit<
    DeepLinkBuyProps,
    'onDismiss'
> {
    chronik: MockChronikClient;
    agora: MockAgora;
    ecc: Ecc;
    theme: CashtabTheme;
    initialPath?: string;
    onDismiss?: () => void;
}

/**
 * Mirrors Token: deep-link BUY shows DeepLinkBuy; clean /token/:id is used
 * on native when returnToBrowser is not set (web uses window.close only).
 */
const TokenRouteForTest: React.FC<{
    tokenId: string;
    quantity: null | string;
    userLocale: string;
    onDismiss: () => void;
}> = ({ tokenId, quantity, userLocale, onDismiss }) => {
    const [searchParams] = useSearchParams();
    const params = useParams();
    const isBuyDeepLink = searchParams.get('action')?.toUpperCase() === 'BUY';
    if (isBuyDeepLink) {
        return (
            <DeepLinkBuy
                tokenId={tokenId}
                quantity={quantity}
                userLocale={userLocale}
                onDismiss={onDismiss}
            />
        );
    }
    return <div>{`Token page ${params.tokenId}`}</div>;
};

const DeepLinkBuyTestWrapper: React.FC<DeepLinkBuyTestWrapperProps> = ({
    chronik,
    agora,
    ecc,
    theme,
    tokenId,
    quantity,
    userLocale,
    initialPath = `/token/${tokenId}?action=BUY`,
    onDismiss = () => undefined,
}) => (
    <WalletProvider
        chronik={chronik as unknown as ChronikClient}
        agora={agora as unknown as Agora}
        ecc={ecc}
    >
        <MemoryRouter initialEntries={[initialPath]}>
            <ThemeProvider theme={theme}>
                <ToastContainer aria-label="Notifications" />
                <Routes>
                    <Route path="/" element={<div>Home</div>} />
                    <Route
                        path="/token/:tokenId"
                        element={
                            <TokenRouteForTest
                                tokenId={tokenId}
                                quantity={quantity}
                                userLocale={userLocale}
                                onDismiss={onDismiss}
                            />
                        }
                    />
                </Routes>
            </ThemeProvider>
        </MemoryRouter>
    </WalletProvider>
);

const tokenMocks = new Map();
tokenMocks.set(cachetCacheMocks.token.tokenId, {
    tx: cachetCacheMocks.tx,
    tokenInfo: cachetCacheMocks.token,
});
tokenMocks.set(bullCacheMocks.token.tokenId, {
    tx: bullCacheMocks.tx,
    tokenInfo: bullCacheMocks.token,
});

describe('<DeepLinkBuy />', () => {
    const ecc = new Ecc();
    let windowCloseSpy: jest.SpyInstance;

    beforeEach(async () => {
        global.fetch = jest.fn();
        // URL-based / extension handoff closes the tab; jsdom cannot
        windowCloseSpy = jest
            .spyOn(window, 'close')
            .mockImplementation(() => undefined);
    });
    afterEach(async () => {
        windowCloseSpy.mockRestore();
        jest.clearAllMocks();
        await localForage.clear();
    });

    it('With a quantity, shows locked qty/price and OK/Reject (no editable amount)', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <DeepLinkBuyTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                quantity={'1.70'}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        expect(await screen.findByText('Confirm Buy')).toBeInTheDocument();
        expect(screen.getByText('Cachet')).toBeInTheDocument();
        expect(screen.getByText('CACHET')).toBeInTheDocument();

        // Locked amount — no deep-link buy qty slider
        expect(
            screen.queryByPlaceholderText(
                `Deep link buy qty ${CACHET_TOKEN_ID}`,
            ),
        ).not.toBeInTheDocument();

        await waitFor(() =>
            expect(screen.getByText(/1\.70 CACHET/)).toBeInTheDocument(),
        );
        expect(screen.getByRole('button', { name: 'OK' })).not.toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Reject' }),
        ).toBeInTheDocument();
    });

    it('Without a quantity, the amount is editable', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <DeepLinkBuyTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                quantity={null}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        const buyAmountInput = (await screen.findByPlaceholderText(
            `Deep link buy qty ${CACHET_TOKEN_ID}`,
        )) as HTMLInputElement;
        // Defaults to the selected offer's min accept
        await waitFor(() => expect(buyAmountInput.value).not.toBe(''));

        await userEvent.clear(buyAmountInput);
        await userEvent.type(buyAmountInput, '1.70');
        await waitFor(() =>
            expect(screen.getByText(/1\.70 CACHET/)).toBeInTheDocument(),
        );
    });

    it('Selects a later offer when the cheapest cannot fill the quantity', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAffordable,
            agoraOfferCachetAlphaTwo,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <DeepLinkBuyTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                quantity={'150'}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        await waitFor(() =>
            expect(screen.getByText(/150\.00 CACHET/)).toBeInTheDocument(),
        );
        expect(screen.getByRole('button', { name: 'OK' })).not.toBeDisabled();
    });

    it('An unfillable quantity informs the user and disables OK', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <DeepLinkBuyTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                quantity={'99999999'}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        expect(
            await screen.findByText(
                'No single offer can fill the requested quantity',
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled();
    });

    it('Skips an offer made by the active wallet', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAffordable,
            agoraOfferCachetAlphaTwo,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialAlphaWallet],
            tokenMocks,
        );
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <DeepLinkBuyTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                quantity={'150'}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        expect(
            await screen.findByText(
                'No single offer can fill the requested quantity',
            ),
        ).toBeInTheDocument();
    });

    it('Reject tries to close the tab (same as SendXec URL txs)', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <DeepLinkBuyTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                quantity={'1.70'}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();
        await screen.findByText('Confirm Buy');

        await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
        // Extension / script-opened handoff; no navigate fallback on web
        expect(windowCloseSpy).toHaveBeenCalled();
        expect(
            screen.queryByText(`Token page ${CACHET_TOKEN_ID}`),
        ).not.toBeInTheDocument();
    });

    it('OK completes the buy, shows a descriptive success message, and auto-closes', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        // Avoid brittle broadcast-hex fixtures: take() is covered in OrderBook
        // tests with a recorded rawtx. Here we assert the confirm → success UX.
        const takeSpy = jest
            .spyOn(agoraOfferCachetAlphaOne, 'take')
            .mockResolvedValue({
                success: true,
                broadcasted: [
                    '935b8a8da688c829874657c56c26b7a8f18703bd9a58576323f28c8caa71510a',
                ],
                errors: undefined,
            } as Awaited<ReturnType<typeof agoraOfferCachetAlphaOne.take>>);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <DeepLinkBuyTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                quantity={'.30'}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();
        await waitFor(() =>
            expect(
                screen.getByRole('button', { name: 'OK' }),
            ).not.toBeDisabled(),
        );

        await userEvent.click(screen.getByRole('button', { name: 'OK' }));

        expect(
            await screen.findByText(/You bought .* CACHET for .* XEC/),
        ).toBeInTheDocument();
        expect(screen.getByText('View Transaction')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Close' }),
        ).toBeInTheDocument();
        expect(takeSpy).toHaveBeenCalled();
        expect(windowCloseSpy).not.toHaveBeenCalled();

        // Autoclose after the same duration as URL-based Send success, then
        // window.close() (no navigate fallback on web)
        await act(async () => {
            await new Promise(resolve =>
                setTimeout(resolve, SUCCESS_MODAL_DURATION_MS + 150),
            );
        });
        expect(windowCloseSpy).toHaveBeenCalled();
        expect(
            screen.queryByText(`Token page ${CACHET_TOKEN_ID}`),
        ).not.toBeInTheDocument();

        takeSpy.mockRestore();
    });

    it('No active offers shows an info message and disables OK', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, []);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <DeepLinkBuyTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                quantity={null}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        expect(
            await screen.findByText('No active offers for this token'),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'OK' })).toBeDisabled();
        expect(
            screen.getByRole('button', { name: 'Reject' }),
        ).not.toBeDisabled();
    });
});
