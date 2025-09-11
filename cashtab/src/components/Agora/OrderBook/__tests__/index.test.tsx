// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import * as localForage from 'localforage';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import {
    agoraPartialAlphaWallet,
    agoraPartialBetaWallet,
    agoraPartialBetaMoreBalanceWallet,
    agoraOfferCachetAlphaOne,
    agoraOfferCachetAlphaTwo,
    agoraOfferCachetBetaOne,
    agoraOfferXecxAlphaOne,
    cachetCacheMocks,
    tokenMockXecx,
    SettingsUsd,
    agoraOfferCachetAlphaUnacceptable,
    agoraOfferCachetAffordable,
    agoraOfferCachetUnaffordable,
    bullCacheMocks,
    CachedXecx,
} from 'components/Agora/fixtures/mocks';
import { FEE_SATS_PER_KB_XEC_MINIMUM } from 'constants/transactions';
import { ChronikClient } from 'chronik-client';
import { Ecc, Address } from 'ecash-lib';
import { Agora } from 'ecash-agora';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../../../modules/mock-chronik-client';
import Orderbook, { OrderBookProps } from 'components/Agora/OrderBook';
import { ToastContainer } from 'react-toastify';
import { CashtabTheme } from 'assets/styles/theme';
import { WalletProvider } from 'wallet/context';
import { mockPrice, SupportedCashtabStorageKeys, prepareContext } from 'test';
import CashtabCache from 'config/CashtabCache';
import { cashtabCacheToJSON } from 'helpers';

/**
 * OrderBook returns null when wallet is not loaded
 * This is expected behavior as, in the app, OrderBook never appears
 * unless the user has created a wallet
 * In testing though this is not expected behavior and takes some time
 */
const waitForContext = async () => {
    await screen.findByTitle('Loading', {}, { timeout: 3000 });
};

// We need to wrap OrderBook with context so we can useContext instead of prop drilling
interface OrderBookTestWrapperProps extends OrderBookProps {
    chronik: MockChronikClient;
    agora: MockAgora;
    ecc: Ecc;
    theme: CashtabTheme;
    priceInFiat?: boolean;
}
const OrderBookTestWrapper: React.FC<OrderBookTestWrapperProps> = ({
    chronik,
    agora,
    ecc,
    theme,
    tokenId,
    userLocale,
    noIcon,
    orderBookInfoMap,
    priceInFiat = false,
}) => (
    <WalletProvider
        chronik={chronik as unknown as ChronikClient}
        agora={agora as unknown as Agora}
        ecc={ecc}
    >
        <ThemeProvider theme={theme}>
            <ToastContainer />
            <div>Test</div>
            <Orderbook
                tokenId={tokenId}
                userLocale={userLocale}
                noIcon={noIcon}
                orderBookInfoMap={orderBookInfoMap}
                priceInFiat={priceInFiat}
            />
        </ThemeProvider>
    </WalletProvider>
);

const tokenMocks = new Map();
// CACHET
tokenMocks.set(cachetCacheMocks.token.tokenId, {
    tx: cachetCacheMocks.tx,
    tokenInfo: cachetCacheMocks.token,
});
// BULL
tokenMocks.set(bullCacheMocks.token.tokenId, {
    tx: bullCacheMocks.tx,
    tokenInfo: bullCacheMocks.token,
});

/**
 * Test expected behavior of the OrderBook component
 * OrderBook is a self-contained component that presents Agora Partial offers to the user
 * The logic for fetching the offers, updating the offers on buys and cancels, and buying
 * and canceling offers is all in the component
 *
 * Keeping the logic in the component makes it easy to load many OrderBooks in parallel.
 *
 * TODO add websocket support for faster self-updating.
 *
 * We accept a "noIcon" param for a compact version of the OrderBook suitable for appearing
 * on a token information page that already displays the icon
 */
describe('<OrderBook />', () => {
    const ecc = new Ecc();
    const CACHET_TOKEN_ID = cachetCacheMocks.token.tokenId;

    beforeEach(async () => {
        // Mock the fetch call to Cashtab's price API
        global.fetch = jest.fn();
    });
    afterEach(async () => {
        jest.clearAllMocks();
        await localForage.clear();
    });

    it('We render expected msg if no agora partial listings are found for this token', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();
        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialAlphaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        // No active offers
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, []);

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // After offers load, we see a notice that there are no active offers
        expect(
            await screen.findByText('No active offers for this token'),
        ).toBeInTheDocument();
    });
    it('An error notice is rendered if there is some error in querying listings', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        // Error querying offers
        mockedAgora.setActiveOffersByTokenId(
            CACHET_TOKEN_ID,
            new Error('some error querying offers'),
        );

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialAlphaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // After offers load, we see a notice that there are no active offers
        expect(
            await screen.findByText(
                'Error querying agora for active offers. Try again later.',
            ),
        ).toBeInTheDocument();
    });
    it('We can see a rendered offer', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialAlphaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // After loading, we see the token name and ticker above its PartialOffer
        expect(await screen.findByText('Cachet')).toBeInTheDocument();
        expect(await screen.findByText('CACHET')).toBeInTheDocument();

        // We see the token icon
        expect(screen.getByTitle(CACHET_TOKEN_ID)).toBeInTheDocument();

        // Hit the fiat switch since this test uses those values
        await userEvent.click(
            screen.getByTitle(`Toggle price for ${CACHET_TOKEN_ID}`),
        );

        // We see the spot price on the depth bar
        expect(screen.getByText('$0.3300 USD')).toBeInTheDocument();

        // We can toggle to see the spot price in XEC
        await userEvent.click(
            screen.getByTitle(`Toggle price for ${CACHET_TOKEN_ID}`),
        );

        // Spot price on depth bar is now in XEC
        expect(screen.queryByText('$0.3300 USD')).not.toBeInTheDocument();
        expect(screen.getByText('10,000.97 XEC')).toBeInTheDocument();

        // The price of the selected amount is also now in XEC
        expect(await screen.findByText('1k XEC')).toBeInTheDocument();

        // Toggle back
        await userEvent.click(
            screen.getByTitle(`Toggle price for ${CACHET_TOKEN_ID}`),
        );

        // The min offer amount is selected by default
        expect(await screen.findByText('.10 CACHET')).toBeInTheDocument();

        // We see the price of the min offer amount in fiat
        expect(screen.getByText('$0.03303 USD')).toBeInTheDocument();

        // Query the slider by its role and aria-labelledby attribute
        const slider = screen.getByRole('slider');

        // We see a slider
        expect(slider).toBeInTheDocument();

        // We have an input field for decimalized numbers
        const buyAmountCachetInput = screen.getByPlaceholderText(
            `Select buy qty ${CACHET_TOKEN_ID}`,
        );

        // We can type and see the price of different quantities
        await userEvent.clear(buyAmountCachetInput);
        await userEvent.type(buyAmountCachetInput, '1.70');
        expect(screen.getByText('1.7 CACHET')).toBeInTheDocument();
        expect(screen.getByText('$0.5611 USD')).toBeInTheDocument();

        // Slider action is for informational purposes only here, though, because
        // this wallet created this offer (determined by public key)

        // Because this offer was created by this wallet, we have the option to cancel it
        expect(
            await screen.findByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();
    });
    it('We can see a rendered offer with fiat pricing on load', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialAlphaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
                priceInFiat={true}
            />,
        );

        await waitForContext();

        // After loading, we see the token name and ticker above its PartialOffer
        expect(await screen.findByText('Cachet')).toBeInTheDocument();
        expect(await screen.findByText('CACHET')).toBeInTheDocument();

        // We see the token icon
        expect(screen.getByTitle(CACHET_TOKEN_ID)).toBeInTheDocument();

        expect(
            screen.getByTitle(`Toggle price for ${CACHET_TOKEN_ID}`),
        ).toBeChecked();

        // We see the spot price on the depth bar
        expect(screen.getByText('$0.3300 USD')).toBeInTheDocument();
    });
    it('We can see a rendered offer in an OrderBook with noIcon', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialAlphaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
                noIcon
            />,
        );

        await waitForContext();

        // We see the spot price on the depth bar
        expect(await screen.findByText('10,000.97 XEC')).toBeInTheDocument();

        // Hit the fiat switch since this test uses those values
        await userEvent.click(
            screen.getByTitle(`Toggle price for ${CACHET_TOKEN_ID}`),
        );

        // After loading, we DO NOT see the token name and ticker above its PartialOffer
        expect(screen.queryByText('Cachet')).not.toBeInTheDocument();
        expect(screen.queryByText('CACHET')).not.toBeInTheDocument();

        // We DO NOT see the token icon
        expect(screen.queryByTitle(CACHET_TOKEN_ID)).not.toBeInTheDocument();

        // The min offer amount is selected by default
        expect(await screen.findByText('.10 CACHET')).toBeInTheDocument();
        // We DO NOT see the formatted price in XEC as fiat is toggled
        expect(screen.queryByText('1k XEC')).not.toBeInTheDocument();
        // We see the price in fiat
        expect(screen.getByText('$0.03303 USD')).toBeInTheDocument();

        // Query the slider by its role and aria-labelledby attribute
        const slider = screen.getByRole('slider');

        // We see a slider
        expect(slider).toBeInTheDocument();

        // We have an input field for decimalized numbers
        const buyAmountCachetInput = screen.getByPlaceholderText(
            `Select buy qty ${CACHET_TOKEN_ID}`,
        );

        // We can type and see the price of different quantities
        await userEvent.clear(buyAmountCachetInput);
        await userEvent.type(buyAmountCachetInput, '1.70');
        expect(screen.getByText('1.7 CACHET')).toBeInTheDocument();
        // XEC amounts are only shown if toggle is selected
        expect(screen.queryByText('17k XEC')).not.toBeInTheDocument();
        expect(screen.getByText('$0.5611 USD')).toBeInTheDocument();

        // Slider/input action is for informational purposes only here, though, because
        // this wallet created this offer (determined by public key)

        // Because this offer was created by this wallet, we have the option to cancel it
        expect(
            await screen.findByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();
    });
    it('We can see multiple offers, some we made, others we did not, and we can cancel an offer', async () => {
        mockPrice(0.00003);
        const mockedAgora = new MockAgora();

        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
            agoraOfferCachetAlphaTwo,
            agoraOfferCachetBetaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialAlphaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        // Mock satsPerKb to minimum fee for this test to match hardcoded transaction hex
        await localForage.setItem('settings', {
            ...SettingsUsd,
            satsPerKb: FEE_SATS_PER_KB_XEC_MINIMUM,
        });

        // Prepare mockedChronik for a tx that cancels a listing
        const cancelHex =
            '0200000002f7bb552354b6f5076eb2664a8bcbbedc87b42f2ebfcb1480ee0a9141bbae63590000000064414e90dfcdd1508f599267d5b761db8268c164567032f6eb597677d010df4e67eb61e29721535f92070d3c77d7679d78a209122aabec6c7f8d536db072b7dda28241210233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afdffffffffbfd08cec4d74b7820cea750b36a0a69d88b6cec3c084caf29e9b866cd8999f6d01000000fdab010441475230075041525449414c4162790797e5a77ccb0326f5e85ad2ec334b17616a636bad4d21a9fa8ec73e6e249443ef7f598a513ee6023bf0f4090300e3f1f37e96c5ea39fe15db0f2f3a56b941004d58014c766a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb10800000000000000000001db4603000000000079150000000000008ec420000000000008b7023e0233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afd08b0caff7f00000000ab7b63817b6ea26976038ec420a2697603db46039700887d94527901377f75789263587e7803db4603965880bc007e7e68587e527903db4603965880bc007e7e825980bc7c7e01007e7b027815930279159657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d6007f5c7f7701207f547f750408b7023e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087ffffffff030000000000000000376a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000271022020000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488acaf650600000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac00000000';
        const cancelTxid =
            '256ffa0a5e18f7c546673ff6c49fb4d483fe2cbae3b1269bc1000c4c6d950fa9';
        mockedChronik.setBroadcastTx(cancelHex, cancelTxid);

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // After loading, we see the token name and ticker above its PartialOffer
        expect(await screen.findByText('Cachet')).toBeInTheDocument();
        expect(await screen.findByText('CACHET')).toBeInTheDocument();

        // We see the token icon
        expect(screen.getByTitle(CACHET_TOKEN_ID)).toBeInTheDocument();

        // For tokens with multiple partial offers available, the lowest-priced
        // offer is selected by default ("spot price")
        const CACHET_SPOT_MIN_QTY = '.20 CACHET';
        const CACHET_SPOT_PRICE_MIN_BUY = '240.64 XEC';
        const CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.0072 USD';

        // Quantities are not displayed until they load, so we await
        expect(
            await screen.findByText(CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();

        // We see a spot price for each active offer in XEC
        expect(screen.getByText('1,200.01 XEC')).toBeInTheDocument();
        expect(screen.getByText('10,000.97 XEC')).toBeInTheDocument();
        expect(screen.getByText('12,000.66 XEC')).toBeInTheDocument();

        // If we toggle to fiat, we see fiat prices
        await userEvent.click(
            screen.getByTitle(`Toggle price for ${CACHET_TOKEN_ID}`),
        );

        // We see a spot price for each active offer in fiat
        expect(screen.getByText('$0.03600 USD')).toBeInTheDocument();
        expect(screen.getByText('$0.3000 USD')).toBeInTheDocument();
        expect(screen.getByText('$0.3600 USD')).toBeInTheDocument();

        // Toggle back to see XEC
        await userEvent.click(
            screen.getByTitle(`Toggle price for ${CACHET_TOKEN_ID}`),
        );

        // Toggle is set to XEC by default, so we do not see fiat
        expect(screen.getByText(CACHET_SPOT_PRICE_MIN_BUY)).toBeInTheDocument();
        expect(
            screen.queryByText(CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).not.toBeInTheDocument();

        // Because the spot offer was created by this pk, we see a cancel button
        expect(
            screen.getByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();

        // If we select the offer created by the Beta wallet, we see a buy button
        await userEvent.click(screen.getByText('12,000.66 XEC'));

        // We also see updates to the rendered spot details
        const UPDATED_CACHET_SPOT_MIN_QTY = '.30 CACHET';
        const UPDATED_CACHET_SPOT_PRICE_MIN_BUY = '3.6k XEC';
        const UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.1081 USD';
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_PRICE_MIN_BUY),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).not.toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: 'Buy CACHET' }),
        ).toBeInTheDocument();

        // Let's select our other offer
        await userEvent.click(screen.getByText('10,000.97 XEC'));

        const OTHER_CACHET_SPOT_MIN_QTY = '.10 CACHET';
        const OTHER_CACHET_SPOT_PRICE_MIN_BUY = '1k XEC';
        const OTHER_CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.03003 USD';
        // Quantities are not displayed until they load, so we await
        expect(
            await screen.findByText(OTHER_CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();
        expect(
            screen.getByText(OTHER_CACHET_SPOT_PRICE_MIN_BUY),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(OTHER_CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).not.toBeInTheDocument();

        // Let's cancel it (a little high vs spot)
        await userEvent.click(
            screen.getByRole('button', { name: 'Cancel your offer' }),
        );

        // We see a confirmation modal
        expect(
            screen.getByText(
                'Cancel your offer to sell 100.00 Cachet (CACHET) for 10,000.97 XEC each?',
            ),
        ).toBeInTheDocument();

        // We cancel
        await userEvent.click(screen.getByText('OK'));

        // Notification on successful cancel
        expect(await screen.findByText(`Canceled listing`)).toBeInTheDocument();

        // Note we can't test that offers are refreshed as we cannot dynamically adjust chronik mocks
        // Would need regtest integration to do this
    });
    it('We can buy an offer', async () => {
        mockPrice(0.00003);
        const mockedAgora = new MockAgora();

        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
            agoraOfferCachetAlphaTwo,
            agoraOfferCachetBetaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        // Set mocks for tx that buys a listing
        const buyHex =
            '0200000002cc3ca4ae9c981a5194dc9c28b14adb4ae21ccef8a81cfb8b2c7b37c97d90930c01000000fd47030441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b14002c4109f92403271f830a5fc41c9448d88cf46fcd4d7f5aa06b3d4b112b34a9e8c5f41f083ce5fe606e8f1fa54c9583d554d8ba8cafae4c7a00ec6090b156e384422020000000000001976a914f208ef75eb0dd778ea4540cbd966a830c7b94bb088ac0f319a3b000000001976a914f208ef75eb0dd778ea4540cbd966a830c7b94bb088ac4d2f01cc3ca4ae9c981a5194dc9c28b14adb4ae21ccef8a81cfb8b2c7b37c97d90930c01000000d67b63817b6ea269760384c420a26976036da3019700887d94527901377f75789263587e78036da301965880bc007e7e68587e5279036da301965880bc007e7e825980bc7c7e01007e7b02795993027a599657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d6007f5c7f7701207f547f7504590d8762886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffffcab4f1f6fe0b6c6146d4a88bc09a5f311a3b5c4fec0150c11dd03217ae7eab1a590d8762c100000003c62631514d58014c766a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000000000016da30100000000007a5900000000000084c4200000000000590d87620233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afd08a0a3ff7f00000000ab7b63817b6ea269760384c420a26976036da3019700887d94527901377f75789263587e78036da301965880bc007e7e68587e5279036da301965880bc007e7e825980bc7c7e01007e7b02795993027a599657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d6007f5c7f7701207f547f7504590d8762886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087fffffffff327f712cf7e629089daa7e76aa6a22d695f09a8019cd6fce640f5d044d21147000000006441152a7ce0bb4906171714f0fe85c1f96dc04364d33f3f2c5ba75b0c930623bfdf627950312e9cd62b9961dd935c8d0c29889d7c00d4a4da60b8be30b331fc0d664121021e75febb8ae57a8805e80df93732ab7d5d8606377cb30c0f02444809cc085f39ffffffff050000000000000000496a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1080000000000000000080000000000004e0208000000000000001e008d0000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac220200000000000017a914aa18825dc0e70e8a9f016716fe4b16d1842d27ee8722020000000000001976a914f208ef75eb0dd778ea4540cbd966a830c7b94bb088ac0f319a3b000000001976a914f208ef75eb0dd778ea4540cbd966a830c7b94bb088ac590d8762';
        const buyTxid =
            '935b8a8da688c829874657c56c26b7a8f18703bd9a58576323f28c8caa71510a';
        mockedChronik.setBroadcastTx(buyHex, buyTxid);

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // After loading, we see the token name and ticker above its PartialOffer
        expect(await screen.findByText('Cachet')).toBeInTheDocument();
        expect(await screen.findByText('CACHET')).toBeInTheDocument();

        // Hit the fiat switch since this test uses those values
        await userEvent.click(
            screen.getByTitle(`Toggle price for ${CACHET_TOKEN_ID}`),
        );

        // We see the expected spot offer for CACHET
        const CACHET_SPOT_MIN_QTY = '.20 CACHET';
        const CACHET_SPOT_PRICE_MIN_BUY = '240.64 XEC';
        const CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.007219 USD';

        // Quantities are not displayed until they load, so we await
        expect(
            await screen.findByText(CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(CACHET_SPOT_PRICE_MIN_BUY),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        // If we select the offer created by the Beta wallet, we see a cancel button
        await userEvent.click(screen.getByText('$0.3600 USD'));

        // We also see updates to the rendered spot details
        const UPDATED_CACHET_SPOT_MIN_QTY = '.30 CACHET';
        const UPDATED_CACHET_SPOT_PRICE_MIN_BUY = '3.6k XEC';
        const UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.1081 USD';
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(UPDATED_CACHET_SPOT_PRICE_MIN_BUY),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', {
                name: 'Cancel your offer',
            }),
        ).toBeInTheDocument();

        // Select an offer created by Alpha

        await userEvent.click(screen.getByText('$0.3000 USD'));

        const buyCachetButton = screen.getByRole('button', {
            name: 'Buy CACHET',
        });
        expect(buyCachetButton).toBeInTheDocument();

        // Query the slider by its role and aria-labelledby attribute
        const slider = screen.getByRole('slider');

        // We see a slider
        expect(slider).toBeInTheDocument();

        const buyAmountCachetInput = screen.getByPlaceholderText(
            `Select buy qty ${CACHET_TOKEN_ID}`,
        );
        // We expect this field to be populated with min buy amount by default
        expect(buyAmountCachetInput).toHaveValue(0.1);
        // Erase this input
        await userEvent.clear(buyAmountCachetInput);

        // Type an invalid quantity, 1 token satoshi less than full offer
        // 99.99 Cachet, which would create an unacceptable remainder of 0.01 CACHET (offer min is 0.10)
        await userEvent.type(buyAmountCachetInput, '99.99');

        // We see expected validation message
        expect(screen.getByText(/99.9 or the full offer/)).toBeInTheDocument();
        // Buy button is disabled for this qty
        expect(buyCachetButton).toBeDisabled();

        // OK let's buy some other amount
        await userEvent.clear(buyAmountCachetInput);
        await userEvent.type(buyAmountCachetInput, '55.55');

        // Buy button should be enabled since affordable offer is selected
        console.log(
            'Buy button disabled:',
            (buyCachetButton as HTMLButtonElement).disabled,
        );

        // Debug: Show the current DOM state to see if there are validation errors
        console.log('Current DOM state:');
        screen.debug();

        expect(buyCachetButton).not.toBeDisabled();

        await userEvent.click(buyCachetButton);

        // We see a confirmation modal
        expect(
            await screen.findByText('Execute this trade?'),
        ).toBeInTheDocument();
        // We see target qty and the actual qty
        expect(screen.getAllByText('55.55')).toHaveLength(2);
        // We DO NOT see the delta
        expect(screen.queryByText('Qty Delta:')).not.toBeInTheDocument();
        // We see the price in XEC
        expect(screen.getByText('555,553.28 XEC')).toBeInTheDocument();
        // We see the price in USD in the modal and on the form
        expect(screen.getAllByText('$16.67 USD')).toHaveLength(2);

        // But this is not the spot offer, so we can't buy it
        // We see info to this effect
        expect(
            screen.getByText('This offer is 733% above spot'),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Cashtab does not support buying offers more than 25% above spot.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('OK')).toBeDisabled();

        // We will have to choose the spot offer
        // Cancel this buy
        await userEvent.click(screen.getByText('Cancel'));

        // The modal is gone
        expect(
            screen.queryByText(
                'Cashtab does not support buying offers above spot.',
            ),
        ).not.toBeInTheDocument();

        // Select the spot offer
        await userEvent.click(screen.getByText('$0.03600 USD'));

        // Let's do the min buy
        await userEvent.clear(buyAmountCachetInput);
        await userEvent.type(buyAmountCachetInput, '.30');
        await userEvent.click(buyCachetButton);

        // We see a confirmation modal with updated info

        expect(
            await screen.findByText('Execute this trade?'),
        ).toBeInTheDocument();
        // We see target qty
        expect(screen.getByText('.30')).toBeInTheDocument();
        // We DO NOT see the delta
        expect(screen.queryByText('Qty Delta:')).not.toBeInTheDocument();
        // We see the price in XEC
        expect(screen.getByText('360.96 XEC')).toBeInTheDocument();
        // We see the price in USD in the modal and on the form
        expect(screen.getAllByText('$0.01083 USD')).toHaveLength(2);

        // We buy
        await userEvent.click(screen.getByText('OK'));

        // Notification on successful buy
        expect(
            await screen.findByText(
                `Bought .30 Cachet (CACHET) for 360.96 XEC ($0.01083 USD)`,
            ),
        ).toBeInTheDocument();

        // Note we can't test that offers are refreshed as we cannot dynamically adjust chronik mocks
        // Would need regtest integration to do this
    });
    it('Offers listed by the token creator are indicated as such', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
            agoraOfferCachetBetaOne,
        ]);

        const alphaWalletOutputScript = Address.p2pkh(
            agoraPartialAlphaWallet.paths.get(1899).hash,
        ).toScriptHex();

        // Mod tokenmocks so that alphaWallet is the mint address
        const alphaMintedCachetTokenMocks = new Map();
        // CACHET
        alphaMintedCachetTokenMocks.set(cachetCacheMocks.token.tokenId, {
            tx: {
                ...cachetCacheMocks.tx,
                // Note that cashtab pegs the genesis address as the address
                // that receives the genesis qty
                // This is not necessarily the address that minted the token
                outputs: [
                    cachetCacheMocks.tx.outputs[0],
                    {
                        ...cachetCacheMocks.tx.outputs[1],
                        outputScript: alphaWalletOutputScript,
                    },
                    ...cachetCacheMocks.tx.inputs.slice(2),
                ],
            },
            tokenInfo: cachetCacheMocks.token,
        });
        // BULL
        alphaMintedCachetTokenMocks.set(bullCacheMocks.token.tokenId, {
            tx: bullCacheMocks.tx,
            tokenInfo: bullCacheMocks.token,
        });

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialAlphaWallet],
            alphaMintedCachetTokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // After loading, we see the token name and ticker above its PartialOffer
        expect(await screen.findByText('Cachet')).toBeInTheDocument();
        expect(await screen.findByText('CACHET')).toBeInTheDocument();

        // We see the "Listed by token creator" icon, only one time for two offers,
        // as only one of these listings was created by wallet alpha
        expect(
            screen.getByTitle('Listed by token creator'),
        ).toBeInTheDocument();
    });
    it('We can type input and see a previewed offer of actual input with a delta from our typed input', async () => {
        mockPrice(0.00003);

        const mockedAgora = new MockAgora();

        const XECX_TOKEN_ID =
            'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4';

        // Mock XECX offer where we cannot exactly render at full resolution for every value
        mockedAgora.setActiveOffersByTokenId(XECX_TOKEN_ID, [
            agoraOfferXecxAlphaOne,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        // Make sure XECX is cached. Since we do not hold this token, it will not
        // be added to cache by useWallet.ts
        await localForage.setItem(
            SupportedCashtabStorageKeys.CashtabCache,
            cashtabCacheToJSON(
                new CashtabCache(
                    new Map([[tokenMockXecx.tokenId, CachedXecx]]),
                ),
            ),
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={XECX_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // After loading, we see the token name and ticker above its PartialOffer
        // In this test, this also demonstrates that OrderBook will load its own token info
        // If it is not available in wallet cache
        expect(await screen.findByText('Staked XEC')).toBeInTheDocument();

        // We see the expected spot offer for XECX
        const SPOT_MIN_QTY = '960,000.00 XECX';
        const SPOT_PRICE_MIN_BUY = '960k XEC';

        // Quantities are not displayed until they load, so we await
        expect(await screen.findByText(SPOT_MIN_QTY)).toBeInTheDocument();

        expect(screen.getByText(SPOT_PRICE_MIN_BUY)).toBeInTheDocument();

        const buyXecxButton = screen.getByRole('button', {
            name: 'Buy XECX',
        });
        expect(buyXecxButton).toBeInTheDocument();

        const buyAmountXecxInput = screen.getByPlaceholderText(
            `Select buy qty ${XECX_TOKEN_ID}`,
        );
        // We expect this field to be populated with min buy amount by default
        expect(buyAmountXecxInput).toHaveValue(960000);

        // Erase this input
        await userEvent.clear(buyAmountXecxInput);

        // Type a valid quantity that cannot exactly be accepted by this offer
        await userEvent.type(buyAmountXecxInput, '178109597.15');

        // Because this exceeds our balance, we see expected validation error
        expect(
            screen.getByText(
                `Buy price (178.11M XEC) exceeds available balance (10M XEC).`,
            ),
        ).toBeInTheDocument();

        // So the buy button is disabled
        expect(buyXecxButton).toBeDisabled();

        // Erase this input
        await userEvent.clear(buyAmountXecxInput);

        // Type a valid quantity that cannot exactly be accepted by this offer and is within our means
        await userEvent.type(buyAmountXecxInput, '960001');

        await userEvent.click(buyXecxButton);

        // We see a confirmation modal
        expect(
            await screen.findByText('Execute this trade?'),
        ).toBeInTheDocument();
        // We see target qty
        expect(screen.getByText('960,001')).toBeInTheDocument();
        // We see actual qty
        expect(screen.getByText('960,000.00')).toBeInTheDocument();
        // We see the delta
        expect(screen.getByText('Qty Delta:')).toBeInTheDocument();
        expect(screen.getByText('-1')).toBeInTheDocument();
        // We see the price in XEC
        expect(screen.getByText('960,000 XEC')).toBeInTheDocument();
        // We see the price in USD in the modal and on the form
        expect(screen.getByText('$28.80 USD')).toBeInTheDocument();
    });
    it('Unacceptable offers are rendered to their makers', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaUnacceptable,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialAlphaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // After loading, we see the token name and ticker above its PartialOffer
        expect(await screen.findByText('Cachet')).toBeInTheDocument();
        expect(await screen.findByText('CACHET')).toBeInTheDocument();

        // We see the token icon
        expect(screen.getByTitle(CACHET_TOKEN_ID)).toBeInTheDocument();

        // We see the spot price on the depth bar for this order, i.e. this order is rended to the maker
        expect(screen.getByText('1 XEC')).toBeInTheDocument();

        // Because this offer was created by this wallet, we have the option to cancel it
        expect(
            await screen.findByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();
    });
    it('Unacceptable offers are NOT rendered to buyers', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaUnacceptable,
        ]);

        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // We see no offers because it's entirely excluded
        expect(
            await screen.findByText('No active offers for this token'),
        ).toBeInTheDocument();
    });
    it('shows unaffordable offers with visual indication', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        // Use an offer that costs more than the user's balance for min buy
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        // Use a wallet with a low balance
        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // The offer should be visible but marked as unaffordable
        expect(await screen.findByText('Cachet')).toBeInTheDocument();
        expect(await screen.findByText('CACHET')).toBeInTheDocument();

        // Should show warning about unaffordable offer
        expect(
            await screen.findByText(
                'This offer requires a minimum purchase that exceeds your available balance.',
            ),
        ).toBeInTheDocument();

        // Buy button should be disabled
        const buyButton = screen.getByRole('button', { name: /Buy CACHET/i });
        expect(buyButton).toBeDisabled();

        // Slider and percentage buttons should not be visible for unaffordable offers
        expect(screen.queryByText('25%')).not.toBeInTheDocument();
        expect(screen.queryByText('50%')).not.toBeInTheDocument();
        expect(screen.queryByText('75%')).not.toBeInTheDocument();
        expect(screen.queryByText('Max')).not.toBeInTheDocument();
    });
    it('renders percentage buttons and sets correct amounts when user can afford the whole offer', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        // Use an offer the user can fully afford
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        // Use a wallet with a high balance
        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaMoreBalanceWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // Wait for the offer to be visible
        expect(await screen.findByText('Cachet')).toBeInTheDocument();
        await userEvent.click(screen.getByText('10,000.97 XEC'));

        // Percentage buttons should be present
        expect(screen.getByText('25%')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('Max')).toBeInTheDocument();

        // Test 25% button
        await userEvent.click(screen.getByText('25%'));
        expect(screen.getByText('25.00 CACHET')).toBeInTheDocument();

        // Test 50% button
        await userEvent.click(screen.getByText('50%'));
        expect(screen.getByText('50.00 CACHET')).toBeInTheDocument();

        // Test 75% button
        await userEvent.click(screen.getByText('75%'));
        expect(screen.getByText('75.00 CACHET')).toBeInTheDocument();

        // Test Max button
        await userEvent.click(screen.getByText('Max'));
        expect(screen.getByText('100.00 CACHET')).toBeInTheDocument();
    });
    it('auto-selects affordable offers over unaffordable ones', async () => {
        mockPrice(0.000033);
        const mockedAgora = new MockAgora();

        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetUnaffordable, // Lower price, unaffordable
            agoraOfferCachetAffordable, // Higher price, affordable
        ]);

        // Use a wallet with moderate balance
        const mockedChronik = await prepareContext(
            localForage,
            [agoraPartialBetaWallet],
            tokenMocks,
        );

        // Set expected settings in localforage
        await localForage.setItem(
            SupportedCashtabStorageKeys.Settings,
            SettingsUsd,
        );

        render(
            <OrderBookTestWrapper
                agora={mockedAgora}
                chronik={mockedChronik}
                ecc={ecc}
                theme={theme}
                tokenId={CACHET_TOKEN_ID}
                userLocale={'en-US'}
            />,
        );

        await waitForContext();

        // Should show both offers
        expect(await screen.findByText('Cachet')).toBeInTheDocument();

        // Wait for auto-selection to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Should not show the unaffordable warning since the affordable offer should be selected
        expect(
            screen.queryByText(
                'This offer requires a minimum purchase that exceeds your available balance.',
            ),
        ).not.toBeInTheDocument();

        // Buy button should be enabled since affordable offer is selected
        const buyButton = screen.getByRole('button', { name: /Buy CACHET/i });
        expect(buyButton).not.toBeDisabled();
    });
});
