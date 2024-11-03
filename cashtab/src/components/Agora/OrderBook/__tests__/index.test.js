// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import {
    agoraPartialAlphaWallet,
    agoraOfferCachetAlphaOne,
    agoraOfferCachetAlphaTwo,
    agoraOfferCachetBetaOne,
    cachetCacheMocks,
    agoraPartialAlphaKeypair,
    CachedCachet,
    SettingsUsd,
} from 'components/Agora/fixtures/mocks';
import { Ecc, initWasm } from 'ecash-lib';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../../../modules/mock-chronik-client';
import Orderbook from 'components/Agora/OrderBook';
import { Bounce } from 'react-toastify';
import { CashtabNotification } from 'components/App/styles';

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
    let ecc;
    const CACHET_TOKEN_ID = cachetCacheMocks.token.tokenId;
    beforeAll(async () => {
        await initWasm();
        ecc = new Ecc();
    });

    let mockedChronik;
    beforeEach(async () => {
        mockedChronik = new MockChronikClient();
    });
    afterEach(async () => {
        jest.clearAllMocks();
    });
    it('We render expected msg if no agora partial listings are found for this token', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, []);

        render(
            <ThemeProvider theme={theme}>
                <Orderbook
                    tokenId={CACHET_TOKEN_ID}
                    cachedTokenInfo={CachedCachet}
                    settings={SettingsUsd}
                    userLocale={'en-US'}
                    fiatPrice={0.000033}
                    activePk={agoraPartialAlphaKeypair.pk}
                    wallet={agoraPartialAlphaWallet}
                    ecc={ecc}
                    chronik={mockedChronik}
                    agora={mockedAgora}
                    chaintipBlockheight={800000}
                />
            </ThemeProvider>,
        );

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // After offers load, we see a notice that there are no active offers
        expect(
            await screen.findByText('No active offers for this token'),
        ).toBeInTheDocument();
    });
    it('An error notice is rendered if there is some error in querying listings', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByTokenId(
            CACHET_TOKEN_ID,
            new Error('some error querying offers'),
        );

        render(
            <ThemeProvider theme={theme}>
                <Orderbook
                    tokenId={CACHET_TOKEN_ID}
                    cachedTokenInfo={CachedCachet}
                    settings={SettingsUsd}
                    userLocale={'en-US'}
                    fiatPrice={0.000033}
                    activePk={agoraPartialAlphaKeypair.pk}
                    wallet={agoraPartialAlphaWallet}
                    ecc={ecc}
                    chronik={mockedChronik}
                    agora={mockedAgora}
                    chaintipBlockheight={800000}
                />
                ,
            </ThemeProvider>,
        );

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // After offers load, we see a notice that there are no active offers
        expect(
            await screen.findByText(
                'Error querying agora for active offers. Try again later.',
            ),
        ).toBeInTheDocument();
    });
    it('We can see a rendered offer', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        render(
            <ThemeProvider theme={theme}>
                <Orderbook
                    tokenId={CACHET_TOKEN_ID}
                    cachedTokenInfo={CachedCachet}
                    settings={SettingsUsd}
                    userLocale={'en-US'}
                    fiatPrice={0.000033}
                    activePk={agoraPartialAlphaKeypair.pk}
                    wallet={agoraPartialAlphaWallet}
                    ecc={ecc}
                    chronik={mockedChronik}
                    agora={mockedAgora}
                    chaintipBlockheight={800000}
                />
                ,
            </ThemeProvider>,
        );

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // After loading, we see the token name and ticker above its PartialOffer
        expect(await screen.findByText('Cachet (CACHET)')).toBeInTheDocument();

        // We see the token icon
        expect(screen.getByTitle(CACHET_TOKEN_ID)).toBeInTheDocument();

        // We see the spot price on the depth bar
        expect(screen.getByText('$0.33 USD')).toBeInTheDocument();

        // The min offer amount is selected by default
        expect(screen.getByText('.10')).toBeInTheDocument();
        // We see the formatted price in XEC
        expect(await screen.findByText('1k XEC')).toBeInTheDocument();
        // We see the price in fiat
        expect(screen.getByText('$0.033 USD')).toBeInTheDocument();

        // Query the slider by its role and aria-labelledby attribute
        const slider = screen.getByRole('slider');

        // We see a slider
        expect(slider).toBeInTheDocument();

        // We can move the slider and see the price of different quantities
        fireEvent.change(slider, { target: { value: 170 } });
        expect(screen.getByText('1.70')).toBeInTheDocument();
        expect(await screen.findByText('17k XEC')).toBeInTheDocument();
        expect(screen.getByText('$0.56 USD')).toBeInTheDocument();

        // Slider action is for informational purposes only here, though, because
        // this wallet created this offer (determined by public key)

        // Because this offer was created by this wallet, we have the option to cancel it
        expect(
            await screen.findByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();
    });
    it('We can see a rendered offer in an OrderBook with noIcon', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);

        render(
            <ThemeProvider theme={theme}>
                <Orderbook
                    tokenId={CACHET_TOKEN_ID}
                    cachedTokenInfo={CachedCachet}
                    settings={SettingsUsd}
                    userLocale={'en-US'}
                    fiatPrice={0.000033}
                    activePk={agoraPartialAlphaKeypair.pk}
                    wallet={agoraPartialAlphaWallet}
                    ecc={ecc}
                    chronik={mockedChronik}
                    agora={mockedAgora}
                    chaintipBlockheight={800000}
                    noIcon
                />
                ,
            </ThemeProvider>,
        );

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // We see the spot price on the depth bar
        expect(await screen.findByText('$0.33 USD')).toBeInTheDocument();

        // After loading, we DO NOT see the token name and ticker above its PartialOffer
        expect(screen.queryByText('Cachet (CACHET)')).not.toBeInTheDocument();

        // We DO NOT see the token icon
        expect(screen.queryByTitle(CACHET_TOKEN_ID)).not.toBeInTheDocument();

        // The min offer amount is selected by default
        expect(screen.getByText('.10')).toBeInTheDocument();
        // We see the formatted price in XEC
        expect(await screen.findByText('1k XEC')).toBeInTheDocument();
        // We see the price in fiat
        expect(screen.getByText('$0.033 USD')).toBeInTheDocument();

        // Query the slider by its role and aria-labelledby attribute
        const slider = screen.getByRole('slider');

        // We see a slider
        expect(slider).toBeInTheDocument();

        // We can move the slider and see the price of different quantities
        fireEvent.change(slider, { target: { value: 170 } });
        expect(screen.getByText('1.70')).toBeInTheDocument();
        expect(await screen.findByText('17k XEC')).toBeInTheDocument();
        expect(screen.getByText('$0.56 USD')).toBeInTheDocument();

        // Slider action is for informational purposes only here, though, because
        // this wallet created this offer (determined by public key)

        // Because this offer was created by this wallet, we have the option to cancel it
        expect(
            await screen.findByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();
    });
    it('We can see multiple offers, some we made, others we did not, and we can cancel an offer', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
            agoraOfferCachetAlphaTwo,
            agoraOfferCachetBetaOne,
        ]);

        // Set mocks for tx that cancels a listing
        const cancelHex =
            '0200000002f7bb552354b6f5076eb2664a8bcbbedc87b42f2ebfcb1480ee0a9141bbae63590000000064414e90dfcdd1508f599267d5b761db8268c164567032f6eb597677d010df4e67eb61e29721535f92070d3c77d7679d78a209122aabec6c7f8d536db072b7dda28241210233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afdffffffffbfd08cec4d74b7820cea750b36a0a69d88b6cec3c084caf29e9b866cd8999f6d01000000fdab010441475230075041525449414c4162790797e5a77ccb0326f5e85ad2ec334b17616a636bad4d21a9fa8ec73e6e249443ef7f598a513ee6023bf0f4090300e3f1f37e96c5ea39fe15db0f2f3a56b941004d58014c766a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb10800000000000000000001db4603000000000079150000000000008ec420000000000008b7023e0233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afd08b0caff7f00000000ab7b63817b6ea26976038ec420a2697603db46039700887d94527901377f75789263587e7803db4603965880bc007e7e68587e527903db4603965880bc007e7e825980bc7c7e01007e7b027815930279159657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d6007f5c7f7701207f547f750408b7023e886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087ffffffff030000000000000000376a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000271022020000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488acaf650600000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac00000000';
        const cancelTxid =
            '256ffa0a5e18f7c546673ff6c49fb4d483fe2cbae3b1269bc1000c4c6d950fa9';

        mockedChronik.setMock('broadcastTx', {
            input: cancelHex,
            output: { txid: cancelTxid },
        });

        // Note we must include CashtabNotification to test toastify notification
        render(
            <ThemeProvider theme={theme}>
                <CashtabNotification
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                    transition={Bounce}
                />
                <Orderbook
                    tokenId={CACHET_TOKEN_ID}
                    cachedTokenInfo={CachedCachet}
                    settings={SettingsUsd}
                    userLocale={'en-US'}
                    fiatPrice={0.00003}
                    activePk={agoraPartialAlphaKeypair.pk}
                    wallet={agoraPartialAlphaWallet}
                    ecc={ecc}
                    chronik={mockedChronik}
                    agora={mockedAgora}
                    chaintipBlockheight={800000}
                />
            </ThemeProvider>,
        );

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // After loading, we see the token name and ticker above its PartialOffer
        expect(await screen.findByText('Cachet (CACHET)')).toBeInTheDocument();

        // We see the token icon
        expect(screen.getByTitle(CACHET_TOKEN_ID)).toBeInTheDocument();

        // We see a spot price for each active offer
        expect(screen.getByText('$0.30 USD')).toBeInTheDocument();
        expect(screen.getByText('$0.36 USD')).toBeInTheDocument();
        expect(screen.getByText('$0.036 USD')).toBeInTheDocument();

        // For tokens with multiple partial offers available, the lowest-priced
        // offer is selected by default ("spot price")
        const CACHET_SPOT_MIN_QTY = '.20';
        const CACHET_SPOT_PRICE_MIN_BUY = '240.64 XEC';
        const CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.0072 USD';
        // Quantities are not displayed until they load, so we await
        expect(
            await screen.findByText(CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();
        expect(screen.getByText(CACHET_SPOT_PRICE_MIN_BUY)).toBeInTheDocument();
        expect(
            screen.getByText(CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        // Because the spot offer was created by this pk, we see a cancel button
        expect(
            screen.getByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();

        // If we select the offer created by the Beta wallet, we see a buy button
        await userEvent.click(screen.getByText('$0.36 USD'));

        // We also see updates to the rendered spot details
        const UPDATED_CACHET_SPOT_MIN_QTY = '.30';
        const UPDATED_CACHET_SPOT_PRICE_MIN_BUY = '3.6k XEC';
        const UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.11 USD';
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_PRICE_MIN_BUY),
        ).toBeInTheDocument();
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: 'Buy Cachet (CACHET)' }),
        ).toBeInTheDocument();

        // Let's select our other offer
        await userEvent.click(screen.getByText('$0.30 USD'));

        const OTHER_CACHET_SPOT_MIN_QTY = '.10';
        const OTHER_CACHET_SPOT_PRICE_MIN_BUY = '1k XEC';
        const OTHER_CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.030 USD';
        // Quantities are not displayed until they load, so we await
        expect(
            await screen.findByText(OTHER_CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();
        expect(
            screen.getByText(OTHER_CACHET_SPOT_PRICE_MIN_BUY),
        ).toBeInTheDocument();
        expect(
            screen.getByText(OTHER_CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        // Let's cancel it (a little high vs spot)
        await userEvent.click(
            screen.getByRole('button', { name: 'Cancel your offer' }),
        );

        // We see a confirmation modal
        expect(
            screen.getByText(
                'Cancel your offer to sell 100.00 Cachet (CACHET) for 1,000.96 XEC ($0.030 USD)?',
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
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
            agoraOfferCachetAlphaTwo,
            agoraOfferCachetBetaOne,
        ]);

        // Set mocks for tx that buys a listing
        const buyHex =
            '02000000023f091a214fdf5ff45e1cae5f7830800a73740cbd3b752f3694090cc962b59c8101000000fd47030441475230075041525449414c21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b14090e96508f39a758f637806b85a0a876c31291e4d3d7424138de28d669147a6c913a664f37444b7644ad57da91d725b3bbd731858de837d63484be6c834d391ce4422020000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac9de20000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac4d2f013f091a214fdf5ff45e1cae5f7830800a73740cbd3b752f3694090cc962b59c8101000000d67b63817b6ea269760384c420a26976039e17019700887d94527901377f75789263587e78039e1701965880bc007e7e68587e5279039e1701965880bc007e7e825980bc7c7e01007e7b02f6059302f7059657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d6007f5c7f7701207f547f7504ce731f40886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c880441475230872202000000000000ffffffff10a8e6470b2c60bde9' +
            '593640fef02460656cf16385493523091338366a7688e9ce731f40c10000000384c420514d58014c766a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000000000019e17010000000000f70500000000000084c4200000000000ce731f40021e75febb8ae57a8805e80df93732ab7d5d8606377cb30c0f02444809cc085f3908a0a3ff7f00000000ab7b63817b6ea269760384c420a26976039e17019700887d94527901377f75789263587e78039e1701965880bc007e7e68587e5279039e1701965880bc007e7e825980bc7c7e01007e7b02f6059302f7059657807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d6007f5c7f7701207f547f7504ce731f40886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087fffffffff7bb552354b6f5076eb2664a8bcbbedc87b42f2ebfcb1480ee0a9141bbae6359000000006441ed5b343334ab7603062faac5469e7b8b1513cec8e8730c972f4759e4fed0ef9cbd0a50b944d7e8094192ba99fd5eea6e61f568ba12a6b542deca6eea77761d1841210233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afdffffffff050000000000000000496a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000000008000000000000751208000000000000001e007f0500000000001976a914f208ef75eb0dd778ea4540cbd966a830c7b94bb088ac220200000000000017a914211be508fb7608c0a3b3d7a36279894d0450e7378722020000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac9de20000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488acce731f40';
        const buyTxid =
            'eb298e786a91676f5b88b45d31d3979d6a8f96771ed99a69f3fa1aa1306238b0';

        mockedChronik.setMock('broadcastTx', {
            input: buyHex,
            output: { txid: buyTxid },
        });

        // Note we must include CashtabNotification to test toastify notification
        render(
            <ThemeProvider theme={theme}>
                <CashtabNotification
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                    transition={Bounce}
                />
                <Orderbook
                    tokenId={CACHET_TOKEN_ID}
                    cachedTokenInfo={CachedCachet}
                    settings={SettingsUsd}
                    userLocale={'en-US'}
                    fiatPrice={0.00003}
                    activePk={agoraPartialAlphaKeypair.pk}
                    wallet={agoraPartialAlphaWallet}
                    ecc={ecc}
                    chronik={mockedChronik}
                    agora={mockedAgora}
                    chaintipBlockheight={800000}
                />
            </ThemeProvider>,
        );

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // After loading, we see the token name and ticker above its PartialOffer
        expect(await screen.findByText('Cachet (CACHET)')).toBeInTheDocument();

        // We see the expected spot offer for CACHET
        const CACHET_SPOT_MIN_QTY = '.20';
        const CACHET_SPOT_PRICE_MIN_BUY = '240.64 XEC';
        const CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.0072 USD';

        // Quantities are not displayed until they load, so we await
        expect(
            await screen.findByText(CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();
        expect(screen.getByText(CACHET_SPOT_PRICE_MIN_BUY)).toBeInTheDocument();
        expect(
            screen.getByText(CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        // If we select the offer created by the Beta wallet, we see a buy button
        await userEvent.click(screen.getByText('$0.36 USD'));

        // We also see updates to the rendered spot details
        const UPDATED_CACHET_SPOT_MIN_QTY = '.30';
        const UPDATED_CACHET_SPOT_PRICE_MIN_BUY = '3.6k XEC';
        const UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.11 USD';
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_MIN_QTY),
        ).toBeInTheDocument();
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_PRICE_MIN_BUY),
        ).toBeInTheDocument();
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        const buyCachetButton = screen.getByRole('button', {
            name: 'Buy Cachet (CACHET)',
        });
        expect(buyCachetButton).toBeInTheDocument();

        // Query the slider by its role and aria-labelledby attribute
        const slider = screen.getByRole('slider');

        // We see a slider
        expect(slider).toBeInTheDocument();

        // Select an invalid quantity
        // 299.99 Cachet, which would create an unacceptable remainder of 0.01 CACHET (offer min is 0.30)
        fireEvent.change(slider, { target: { value: 29999 } });
        // We see expected validation message
        expect(
            screen.getByText(/299.70 or the full offer/),
        ).toBeInTheDocument();
        // Buy button is disabled for this qty
        expect(buyCachetButton).toBeDisabled();

        // OK let's buy some other amount
        fireEvent.change(slider, { target: { value: 5555 } });

        // Buy button is no longer disabled
        expect(buyCachetButton).toBeEnabled();

        await userEvent.click(buyCachetButton);

        // We see a confirmation modal
        expect(
            await screen.findByText(
                'Buy 55.55 Cachet (CACHET) for 666,636.8 XEC ($20.00 USD)?',
            ),
        ).toBeInTheDocument();

        // We buy
        await userEvent.click(screen.getByText('OK'));

        // Error notification for buy we can't afford
        expect(
            await screen.findByText(
                `Error: Insufficient utxos to accept this offer`,
            ),
        ).toBeInTheDocument();

        // Guess we do buy the min then
        fireEvent.change(slider, { target: { value: 30 } });

        // We see a confirmation modal
        expect(
            await screen.findByText(
                'Buy .30 Cachet (CACHET) for 3,601.92 XEC ($0.11 USD)?',
            ),
        ).toBeInTheDocument();

        // We buy
        await userEvent.click(screen.getByText('OK'));

        // Notification on successful buy
        expect(
            await screen.findByText(
                `Bought ${UPDATED_CACHET_SPOT_MIN_QTY} Cachet (CACHET) for 3,601.92 XEC (${UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY})`,
            ),
        ).toBeInTheDocument();

        // Note we can't test that offers are refreshed as we cannot dynamically adjust chronik mocks
        // Would need regtest integration to do this
    });
});
