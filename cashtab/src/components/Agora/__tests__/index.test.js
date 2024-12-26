// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { when } from 'jest-when';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import appConfig from 'config/app';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import {
    agoraPartialAlphaWallet,
    agoraOfferCachetAlphaOne,
    agoraOfferCachetAlphaTwo,
    agoraOfferCachetBetaOne,
    agoraOfferBullAlphaOne,
    scamAgoraOffer,
    cachetCacheMocks,
    bullCacheMocks,
    scamCacheMocks,
    agoraPartialBetaWallet,
    agoraPartialAlphaKeypair,
    agoraPartialBetaKeypair,
} from 'components/Agora/fixtures/mocks';
import { Ecc, initWasm, toHex } from 'ecash-lib';
import { MockAgora } from '../../../../../modules/mock-chronik-client';
import { token as tokenConfig } from 'config/token';

describe('<Agora />', () => {
    let ecc;
    const CACHET_TOKEN_ID = cachetCacheMocks.token.tokenId;
    const BULL_TOKEN_ID = bullCacheMocks.token.tokenId;
    const SCAM_TOKEN_ID = scamCacheMocks.token.tokenId;
    beforeAll(async () => {
        await initWasm();
        ecc = new Ecc();
    });

    let mockedChronik;
    beforeEach(async () => {
        const mockedDate = new Date('2022-01-01T12:00:00.000Z');
        jest.spyOn(global, 'Date').mockImplementation(() => mockedDate);
        // Mock the app with context at the Token Action screen
        mockedChronik = await initializeCashtabStateForTests(
            [agoraPartialAlphaWallet, agoraPartialBetaWallet],
            localforage,
        );

        // Mock chronik calls used to build token cache to show
        // the user can load a page without having the token info cached
        for (const tokenCacheMock of [
            cachetCacheMocks,
            bullCacheMocks,
            scamCacheMocks,
        ]) {
            mockedChronik.setToken(
                tokenCacheMock.token.tokenId,
                tokenCacheMock.token,
            );
            mockedChronik.setTx(
                tokenCacheMock.token.tokenId,
                tokenCacheMock.tx,
            );
        }

        // Mock the fetch call to Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs requiring different parsing
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        const xecPrice = 0.00003;
        const priceResponse = {
            ecash: {
                usd: xecPrice,
                last_updated_at: 1706644626,
            },
        };
        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(priceResponse),
            });
    });
    afterEach(async () => {
        jest.clearAllMocks();
        await clearLocalForage(localforage);
    });
    it('Screen loads as expected if there are no agora partial listings', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // mock await agora.offeredFungibleTokenIds();
        mockedAgora.setOfferedFungibleTokenIds([]);

        // also mock await agora.activeOffersByPubKey(toHex(activePk))
        mockedAgora.setActiveOffersByPubKey(
            toHex(agoraPartialAlphaKeypair.pk),
            [],
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/agora/`}
            />,
        );

        // Wait for the screen to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for agora offers to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );

        // Wait for element to get token info and load
        expect(await screen.findByTitle('Active Offers')).toBeInTheDocument();

        // We see the Token Offers section
        expect(screen.getByText('Token Offers')).toBeInTheDocument();

        // But we have no offers
        expect(
            screen.getByText('No tokens are currently listed for sale'),
        ).toBeInTheDocument();

        // We switch to see our created offers
        await userEvent.click(screen.getByTitle('Toggle Active Offers'));

        // We have made no offers
        // This is always empty if active offers is empty, as for partials, active offers will render both
        // public offers and offers created by your wallet
        // Your offers you can only cancel, not buy
        expect(
            screen.getByText('You do not have any listed tokens'),
        ).toBeInTheDocument();
    });
    it('A chronik error notice is rendered if there is some error in querying listings', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // mock await agora.offeredFungibleTokenIds();
        mockedAgora.setOfferedFungibleTokenIds(new Error('some chronik error'));

        // also mock await agora.activeOffersByPubKey(toHex(activePk))
        mockedAgora.setActiveOffersByPubKey(
            toHex(agoraPartialAlphaKeypair.pk),
            [],
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/agora/`}
            />,
        );

        // Wait for the screen to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for agora offers to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );

        // A chronik error notice is rendered
        expect(
            await screen.findByText(
                'Error querying listed tokens. Please try again later.',
            ),
        ).toBeInTheDocument();
    });
    it('We can see a rendered offer', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // mock await agora.offeredFungibleTokenIds();
        mockedAgora.setOfferedFungibleTokenIds([CACHET_TOKEN_ID]);

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
        ]);
        // also mock await agora.activeOffersByPubKey(toHex(activePk))
        mockedAgora.setActiveOffersByPubKey(
            toHex(agoraPartialAlphaKeypair.pk),
            [agoraOfferCachetAlphaOne],
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/agora/`}
            />,
        );

        // Wait for the screen to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for agora offers to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );

        // Wait for element to get token info and load
        expect(await screen.findByTitle('Active Offers')).toBeInTheDocument();

        // We have an offer
        expect(screen.getByText('Token Offers')).toBeInTheDocument();

        // We see the token name and ticker above its PartialOffer after OrderBooks load
        expect(await screen.findByText('Cachet (CACHET)')).toBeInTheDocument();

        // Because this offer was created by this wallet, we have the option to cancel it
        expect(
            await screen.findByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();
    });
    it('We can fetch and use the blacklist from token server', async () => {
        when(fetch)
            .calledWith(`${tokenConfig.blacklistServerUrl}/blacklist`)
            .mockResolvedValue({
                json: () => Promise.resolve({ tokenIds: [SCAM_TOKEN_ID] }),
            });

        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // mock await agora.offeredFungibleTokenIds();
        mockedAgora.setOfferedFungibleTokenIds([SCAM_TOKEN_ID]);

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(SCAM_TOKEN_ID, [scamAgoraOffer]);
        // also mock await agora.activeOffersByPubKey(toHex(activePk))
        mockedAgora.setActiveOffersByPubKey(
            toHex(agoraPartialAlphaKeypair.pk),
            [scamAgoraOffer],
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/agora/`}
            />,
        );

        // Wait for the screen to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for agora offers to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );

        // Wait for element to get token info and load
        expect(await screen.findByTitle('Active Offers')).toBeInTheDocument();

        // We see the Token Offers section
        expect(screen.getByText('Token Offers')).toBeInTheDocument();

        // But we have no offers
        expect(
            screen.getByText('No tokens are currently listed for sale'),
        ).toBeInTheDocument();

        // We switch to see our created offers
        await userEvent.click(screen.getByTitle('Toggle Active Offers'));

        expect(screen.getByText('Manage your listings')).toBeInTheDocument();

        // We see the token name and ticker above its PartialOffer
        expect(
            screen.getByText('Badger Universal Token (BUX)'),
        ).toBeInTheDocument();

        // Because this offer was created by this wallet, we have the option to cancel it
        expect(
            screen.getByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();
    });
    it('On token server API fail, we fall back to locally maintained blacklist. A blacklisted offer does not render in all offers, but will render in My offers', async () => {
        when(fetch)
            .calledWith(`${tokenConfig.blacklistServerUrl}/blacklist`)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve(new Error('some token server api error')),
            });

        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // mock await agora.offeredFungibleTokenIds();
        mockedAgora.setOfferedFungibleTokenIds([SCAM_TOKEN_ID]);

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(SCAM_TOKEN_ID, [scamAgoraOffer]);
        // also mock await agora.activeOffersByPubKey(toHex(activePk))
        mockedAgora.setActiveOffersByPubKey(
            toHex(agoraPartialAlphaKeypair.pk),
            [scamAgoraOffer],
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/agora/`}
            />,
        );

        // Wait for the screen to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for agora offers to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );

        // Wait for element to get token info and load
        expect(await screen.findByTitle('Active Offers')).toBeInTheDocument();

        // We see the Token Offers section
        expect(screen.getByText('Token Offers')).toBeInTheDocument();

        // But we have no offers
        expect(
            screen.getByText('No tokens are currently listed for sale'),
        ).toBeInTheDocument();

        // We switch to see our created offers
        await userEvent.click(screen.getByTitle('Toggle Active Offers'));

        expect(screen.getByText('Manage your listings')).toBeInTheDocument();

        // We see the token name and ticker above its PartialOffer
        expect(
            screen.getByText('Badger Universal Token (BUX)'),
        ).toBeInTheDocument();

        // Because this offer was created by this wallet, we have the option to cancel it
        expect(
            screen.getByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();
    });
    it('We can see multiple offers, some we made, others we did not, and we can cancel an offer', async () => {
        // We do not want the date mocked here, it interferes with changing wallets somehow
        jest.spyOn(global, 'Date').mockRestore();

        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // mock await agora.offeredFungibleTokenIds() to return offers for both tokens
        mockedAgora.setOfferedFungibleTokenIds([
            CACHET_TOKEN_ID,
            BULL_TOKEN_ID,
        ]);

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
            agoraOfferCachetAlphaTwo,
            agoraOfferCachetBetaOne,
        ]);
        mockedAgora.setActiveOffersByTokenId(BULL_TOKEN_ID, [
            agoraOfferBullAlphaOne,
        ]);
        // also mock await agora.activeOffersByPubKey(toHex(activePk)), for both walletse
        mockedAgora.setActiveOffersByPubKey(
            toHex(agoraPartialAlphaKeypair.pk),
            [
                agoraOfferCachetAlphaOne,
                agoraOfferCachetAlphaTwo,
                agoraOfferBullAlphaOne,
            ],
        );
        mockedAgora.setActiveOffersByPubKey(toHex(agoraPartialBetaKeypair.pk), [
            agoraOfferCachetBetaOne,
        ]);

        // Set mocks for tx that cancels a listing
        const cancelHex =
            '0200000002f7bb552354b6f5076eb2664a8bcbbedc87b42f2ebfcb1480ee0a9141bbae635900000000644159fdead8c105622e86245089e53c93b61aca17ed1d2407faa40a595ed0d232217578ce586ca14c88cc851dc17c3fe21689dffe572c89d725abddd04b3d289dc141210233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afdffffffff4c48dd93dcc794ee5c9df7a7bc5637e6c78419842b8b9459727db116aed4c42501000000fdad010441475230075041525449414c413e20e3f9d86a991e416d956a1db69e0a2be9cf3cd02f2392f2d4f063d9af49dd1fe3c351ef684eafbae5399ed161e2b21895ae84c364daa9cc06846063abaa9f41004d5a014c766a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f89608000000000000000000027de6240000000000d17b000000000000e833270100000000a16f7e500233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afd089881ff7f00000000ab7b63817b6ea2697604e8332701a26976037de6249700887d94527901377f75789263587e78037de624965880bc007e7e68587e5279037de624965880bc007e7e825980bc7c7e0200007e7b02d07b9302d17b9656807e041976a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e537901257f7702d8007f5c7f7701207f547f7504a16f7e50886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501557f7768ad075041525449414c88044147523087ffffffff030000000000000000376a04534c500001010453454e442001d63c4f4cb496829a6743f7b1805d086ea3877a1dd34b3f92ffba2c9c99f89608000000000000037822020000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488acb2620600000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac00000000';
        const cancelTxid =
            'de8f638c5b11592825ff74f2ec59892f721bc1151486efe86d99a44bf05865bf';

        mockedChronik.setBroadcastTx(cancelHex, cancelTxid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/agora/`}
            />,
        );

        // Wait for the screen to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for agora offers to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );

        // Wait for Agora to load all orderBookInfo
        await waitFor(
            () =>
                expect(
                    screen.queryByTitle('Loading OrderBook info...'),
                ).not.toBeInTheDocument(),
            // This can take some time
            // Fails with timeout 3000, sometimes fails with 5000
            // May need to adjust if experience flakiness
            { timeout: 6000 },
        );

        // When orderbook info has loaded, we see a switch to sort by offer count
        expect(
            await screen.findByTitle('Sort by Offer Count'),
        ).toBeInTheDocument();

        // On load, a switch indicates that the OrderBooks are sorted by tokenId
        expect(screen.getByTitle('Sort by TokenId')).toBeChecked();

        // On load, OrderBooks are sorted by token id
        // Bull tokenId starts with 01d...; Cachet with aed...; so we expect Bull to be first
        const initialOrder = screen
            .getAllByRole('button', { name: /View larger icon for/ })
            .map(el => el.getAttribute('title'));
        expect(initialOrder).toEqual([BULL_TOKEN_ID, CACHET_TOKEN_ID]);

        // Let's sort by offer count
        await userEvent.click(screen.getByTitle('Sort by Offer Count'));

        // Now we expect to see CACHET first, since there are 2 CACHET offers and 1 Bull offer
        const sortedOrder = screen
            .getAllByRole('button', { name: /View larger icon for/ })
            .map(el => el.getAttribute('title'));
        expect(sortedOrder).toEqual([CACHET_TOKEN_ID, BULL_TOKEN_ID]);

        // We can revert to sorting by tokenId
        await userEvent.click(screen.getByTitle('Sort by TokenId'));

        // Now we are back to the initial ordering
        const initialOrderAgain = screen
            .getAllByRole('button', { name: /View larger icon for/ })
            .map(el => el.getAttribute('title'));
        expect(initialOrderAgain).toEqual([BULL_TOKEN_ID, CACHET_TOKEN_ID]);

        // Wait for element to get token info and load
        expect(await screen.findByTitle('Active Offers')).toBeInTheDocument();

        // We have an offer
        expect(screen.getByText('Token Offers')).toBeInTheDocument();

        // We see all token names and tickers above their PartialOffers
        expect(await screen.findByText('Cachet (CACHET)')).toBeInTheDocument();
        expect(await screen.findByText('Bull (BULL)')).toBeInTheDocument();

        // For BULL, there is only one offer, so that offer is the spot price
        const BULL_SPOT_MIN_QTY = '8';
        const BULL_SPOT_PRICE_MIN_BUY = '400.42k XEC';
        const BULL_SPOT_PRICE_FIAT_MIN_BUY = '$12.01 USD';

        // We await this as the component will load and render token info before
        // the offers have finished loading
        expect(
            await screen.findByText(`${BULL_SPOT_MIN_QTY} BULL`),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(BULL_SPOT_PRICE_MIN_BUY),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(BULL_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        // For tokens with multiple partial offers available, the lowest-priced
        // offer is selected by default ("spot price")
        const CACHET_SPOT_MIN_QTY = '.20';
        const CACHET_SPOT_PRICE_MIN_BUY = '240.64 XEC';
        const CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.0072 USD';
        // Quantities are not displayed until they load, so we await
        expect(
            await screen.findByText(`${CACHET_SPOT_MIN_QTY} CACHET`),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(CACHET_SPOT_PRICE_MIN_BUY),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        // Because both spot offers were created by the active Alpha wallet,
        // we see two cancel buttons
        expect(
            screen.getAllByRole('button', { name: 'Cancel your offer' })[1],
        ).toBeInTheDocument();

        // Change wallets using the dropdown menu at the top of the screen
        // NB you cannot have the Date() function mocked if you want to test changing wallets
        await userEvent.selectOptions(
            screen.getByTestId('wallet-select'),
            screen.getByText('Agora Partial Beta'),
        );

        expect(await screen.findByText('42.00 XEC')).toBeInTheDocument();

        // Wait for tokens to re-load (triggered by wallet change)
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );

        // Wait for the wallet to load
        await waitFor(() =>
            expect(screen.queryByTitle('Loading')).not.toBeInTheDocument(),
        );

        // Wait for active offers to load
        expect(await screen.findByTitle('Active Offers')).toBeInTheDocument();

        // Switching wallets triggers a refresh of the offers
        // Now that we are using the other wallet, we see two Buy buttons
        expect(
            await screen.findByRole('button', { name: 'Buy Cachet (CACHET)' }),
        ).toBeInTheDocument();
        expect(
            await screen.findByRole('button', { name: 'Buy Bull (BULL)' }),
        ).toBeInTheDocument();

        // Hit the switch to show listings created by the active wallet (now Beta)
        const toggleAllVsMyOffersSwitch = screen.getByTitle(
            'Toggle Active Offers',
        );
        await userEvent.click(toggleAllVsMyOffersSwitch);
        // we see only the beta-created Cachet offer
        expect(screen.getByText('Cachet (CACHET)')).toBeInTheDocument();
        // We do not see any offers for Bull, this was created by alpha
        expect(screen.queryByText('Bull (BULL)')).not.toBeInTheDocument();

        // Note that we only see orderbooks that we have offers for
        // But we see all offers for these orderbooks

        // The spot price offer is rendered by default
        // This happens to not be our offer
        expect(
            await screen.findByText(`${CACHET_SPOT_MIN_QTY} CACHET`),
        ).toBeInTheDocument();
        // We can buy this offer from the Manage screen
        expect(
            screen.getByRole('button', { name: 'Buy Cachet (CACHET)' }),
        ).toBeInTheDocument();

        // Select our offer
        await userEvent.click(screen.getByText('$0.36 USD'));
        // Now we can only cancel our offer
        expect(
            screen.getByRole('button', { name: 'Cancel your offer' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Buy Cachet (CACHET)' }),
        ).not.toBeInTheDocument();

        // OK go back to all offers
        await userEvent.click(toggleAllVsMyOffersSwitch);

        // Nice but let's go back to the first wallet
        // Change wallets using the dropdown menu at the top of the screen
        // NB you cannot have the Date() function mocked if you want to test changing wallets
        await userEvent.selectOptions(
            screen.getByTestId('wallet-select'),
            screen.getByText('Agora Partial Alpha'),
        );

        expect(await screen.findByText('4,200.00 XEC')).toBeInTheDocument();

        // Wait for tokens to re-load (triggered by wallet change)
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );
        // Wait for the wallet to load
        await waitFor(() =>
            expect(screen.queryByTitle('Loading')).not.toBeInTheDocument(),
        );
        expect(await screen.findByTitle('Active Offers')).toBeInTheDocument();

        // Now we see cancel buttons again
        expect(
            (
                await screen.findAllByRole('button', {
                    name: 'Cancel your offer',
                })
            )[1],
        ).toBeInTheDocument();

        // If we select the offer created by the Beta wallet, we see a buy button
        await userEvent.click(screen.getByText('$0.36 USD'));

        // We also see updates to the rendered spot details
        const UPDATED_CACHET_SPOT_MIN_QTY = '.30';
        const UPDATED_CACHET_SPOT_PRICE_MIN_BUY = '3.6k XEC';
        const UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.11 USD';
        expect(
            screen.getByText(`${UPDATED_CACHET_SPOT_MIN_QTY} CACHET`),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(UPDATED_CACHET_SPOT_PRICE_MIN_BUY),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: 'Buy Cachet (CACHET)' }),
        ).toBeInTheDocument();

        // Let's cancel the BULL offer
        await userEvent.click(
            screen.getByRole('button', { name: 'Cancel your offer' }),
        );

        // We see a confirmation modal
        expect(
            screen.getByText(
                'Cancel your offer to sell 888 Bull (BULL) for 400,424.96 XEC ($12.01 USD)?',
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

        // mock await agora.offeredFungibleTokenIds() to return offers for both tokens
        mockedAgora.setOfferedFungibleTokenIds([
            CACHET_TOKEN_ID,
            BULL_TOKEN_ID,
        ]);

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
            agoraOfferCachetAlphaTwo,
            agoraOfferCachetBetaOne,
        ]);
        mockedAgora.setActiveOffersByTokenId(BULL_TOKEN_ID, [
            agoraOfferBullAlphaOne,
        ]);
        // also mock await agora.activeOffersByPubKey(toHex(activePk)), for both walletse
        mockedAgora.setActiveOffersByPubKey(
            toHex(agoraPartialAlphaKeypair.pk),
            [
                agoraOfferCachetAlphaOne,
                agoraOfferCachetAlphaTwo,
                agoraOfferBullAlphaOne,
            ],
        );
        mockedAgora.setActiveOffersByPubKey(toHex(agoraPartialBetaKeypair.pk), [
            agoraOfferCachetBetaOne,
        ]);

        // Set mocks for tx that buys a listing
        const buyHex =
            '02000000023f091a214fdf5ff45e1cae5f7830800a73740cbd3b752f3694090c' +
            'c962b59c8101000000fd47030441475230075041525449414c21023c72addb4f' +
            'df09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b140727d4804' +
            '0c07efcd104ceb7b7aef07834dbd094f93d1728f584859383c476e5c2c369a51' +
            'b2900ac670eebea381a1db8811609b5b19c22d886c808d6ecd31cc8344220200' +
            '00000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488acaf' +
            'dd0000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488' +
            'ac4d2f013f091a214fdf5ff45e1cae5f7830800a73740cbd3b752f3694090cc9' +
            '62b59c8101000000d67b63817b6ea269760384c420a26976039e17019700887d' +
            '94527901377f75789263587e78039e1701965880bc007e7e68587e5279039e17' +
            '01965880bc007e7e825980bc7c7e01007e7b02f6059302f7059657807e041976' +
            'a914707501557f77a97e0288ac7e7e6b7d02220258800317a9147e024c767258' +
            '7d807e7e7e01ab7e537901257f7702d6007f5c7f7701207f547f7504ce731f40' +
            '886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea8' +
            '6f7bbb7501c17e7c677501557f7768ad075041525449414c8804414752308722' +
            '02000000000000ffffffff7388db19d999ee9eb8b07c726d4fb078a003c9ccea' +
            'fbdb5b89b56b15be464908ce731f40c10000000384c420514d58014c766a0453' +
            '4c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f6' +
            '9191235087a3030e553cb108000000000000000000019e17010000000000f705' +
            '00000000000084c4200000000000ce731f40021e75febb8ae57a8805e80df937' +
            '32ab7d5d8606377cb30c0f02444809cc085f3908a0a3ff7f00000000ab7b6381' +
            '7b6ea269760384c420a26976039e17019700887d94527901377f75789263587e' +
            '78039e1701965880bc007e7e68587e5279039e1701965880bc007e7e825980bc' +
            '7c7e01007e7b02f6059302f7059657807e041976a914707501557f77a97e0288' +
            'ac7e7e6b7d02220258800317a9147e024c7672587d807e7e7e01ab7e53790125' +
            '7f7702d6007f5c7f7701207f547f7504ce731f40886b7ea97e01877e7c926475' +
            '00687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c67750155' +
            '7f7768ad075041525449414c88044147523087fffffffff7bb552354b6f5076e' +
            'b2664a8bcbbedc87b42f2ebfcb1480ee0a9141bbae63590000000064412ea299' +
            '62ae7585308ea45ac92adb7aaa13920e333de700fda95852726016c25a9c25b6' +
            '2e18621d9c834d1369985bd9fe91c8fdac3783a00eea94cd8e1fa629d7412102' +
            '33f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afd' +
            'ffffffff050000000000000000496a04534c500001010453454e4420aed861a3' +
            '1b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000' +
            '000000000008000000000000751208000000000000001e007f05000000000019' +
            '76a914f208ef75eb0dd778ea4540cbd966a830c7b94bb088ac22020000000000' +
            '0017a914211be508fb7608c0a3b3d7a36279894d0450e7378722020000000000' +
            '001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488acafdd000000' +
            '0000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488acce731f' +
            '40';
        const buyTxid =
            '6fbee4e0460e3730f000e2927d69d881b8a536b80fd43b839d32e34c3490ff00';

        mockedChronik.setBroadcastTx(buyHex, buyTxid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/agora/`}
            />,
        );

        // Wait for the screen to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for agora offers to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );

        // Wait for element to get token info and load
        expect(await screen.findByTitle('Active Offers')).toBeInTheDocument();

        // We have an offer
        expect(screen.getByText('Token Offers')).toBeInTheDocument();

        // We see all token names and tickers above their PartialOffers
        expect(await screen.findByText('Cachet (CACHET)')).toBeInTheDocument();
        expect(await screen.findByText('Bull (BULL)')).toBeInTheDocument();

        // We see the expected spot offer for CACHET
        const CACHET_SPOT_MIN_QTY = '.20';
        const CACHET_SPOT_PRICE_MIN_BUY = '240.64 XEC';
        const CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.0072 USD';
        // Quantities are not displayed until they load, so we await
        expect(
            await screen.findByText(`${CACHET_SPOT_MIN_QTY} CACHET`),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(CACHET_SPOT_PRICE_MIN_BUY),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        // Because both spot offers were created by the active Alpha wallet,
        // we see two cancel buttons
        expect(
            screen.getAllByRole('button', { name: 'Cancel your offer' })[1],
        ).toBeInTheDocument();

        // If we select the offer created by the Beta wallet, we see a buy button
        await userEvent.click(screen.getByText('$0.36 USD'));

        // We also see updates to the rendered spot details
        const UPDATED_CACHET_SPOT_MIN_QTY = '.30';
        const UPDATED_CACHET_SPOT_PRICE_MIN_BUY = '3.6k XEC';
        const UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.11 USD';
        expect(
            screen.getByText(`${UPDATED_CACHET_SPOT_MIN_QTY} CACHET`),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(UPDATED_CACHET_SPOT_PRICE_MIN_BUY),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        const buyCachetButton = screen.getByRole('button', {
            name: 'Buy Cachet (CACHET)',
        });
        expect(buyCachetButton).toBeInTheDocument();

        // Note I was not able to adjust the slider value in react testing library
        // We do the min buy

        await userEvent.click(buyCachetButton);
        // We see a confirmation modal
        expect(
            screen.getByText(
                `Buy ${UPDATED_CACHET_SPOT_MIN_QTY} Cachet (CACHET) for 3,601.92 XEC (${UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY})?`,
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
    it('We get expected error if we try to buy an offer we cannot afford', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // mock await agora.offeredFungibleTokenIds() to return offers for both tokens
        mockedAgora.setOfferedFungibleTokenIds([
            CACHET_TOKEN_ID,
            BULL_TOKEN_ID,
        ]);

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(CACHET_TOKEN_ID, [
            agoraOfferCachetAlphaOne,
            agoraOfferCachetAlphaTwo,
            agoraOfferCachetBetaOne,
        ]);
        mockedAgora.setActiveOffersByTokenId(BULL_TOKEN_ID, [
            agoraOfferBullAlphaOne,
        ]);
        // also mock await agora.activeOffersByPubKey(toHex(activePk)), for both walletse
        mockedAgora.setActiveOffersByPubKey(
            toHex(agoraPartialAlphaKeypair.pk),
            [
                agoraOfferCachetAlphaOne,
                agoraOfferCachetAlphaTwo,
                agoraOfferBullAlphaOne,
            ],
        );
        mockedAgora.setActiveOffersByPubKey(toHex(agoraPartialBetaKeypair.pk), [
            agoraOfferCachetBetaOne,
        ]);

        const emptyWalletMockedChronik = await initializeCashtabStateForTests(
            [
                {
                    ...agoraPartialAlphaWallet,
                    state: {
                        ...agoraPartialAlphaWallet.state,
                        nonSlpUtxos: [],
                    },
                },
                agoraPartialBetaWallet,
            ],
            localforage,
        );

        // Mock chronik calls used to build token cache to show
        // the user can load a page without having the token info cached
        for (const tokenCacheMock of [cachetCacheMocks, bullCacheMocks]) {
            emptyWalletMockedChronik.setToken(
                tokenCacheMock.token.tokenId,
                tokenCacheMock.token,
            );
            emptyWalletMockedChronik.setTx(
                tokenCacheMock.token.tokenId,
                tokenCacheMock.tx,
            );
        }

        render(
            <CashtabTestWrapper
                chronik={emptyWalletMockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/agora/`}
            />,
        );

        // Wait for the screen to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for agora offers to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading active offers'),
            ).not.toBeInTheDocument(),
        );

        // Wait for element to get token info and load
        expect(await screen.findByTitle('Active Offers')).toBeInTheDocument();

        // We have an offer
        expect(screen.getByText('Token Offers')).toBeInTheDocument();

        // We see all token names and tickers above their PartialOffers
        expect(await screen.findByText('Cachet (CACHET)')).toBeInTheDocument();
        expect(await screen.findByText('Bull (BULL)')).toBeInTheDocument();

        // We see the expected spot offer for CACHET
        const CACHET_SPOT_MIN_QTY = '.20';
        const CACHET_SPOT_PRICE_MIN_BUY = '240.64 XEC';
        const CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.0072 USD';
        // Quantities are not displayed until they load, so we await
        expect(
            await screen.findByText(`${CACHET_SPOT_MIN_QTY} CACHET`),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(CACHET_SPOT_PRICE_MIN_BUY),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        // Because both spot offers were created by the active Alpha wallet,
        // we see two cancel buttons
        expect(
            screen.getAllByRole('button', { name: 'Cancel your offer' })[1],
        ).toBeInTheDocument();

        // If we select the offer created by the Beta wallet, we see a buy button
        await userEvent.click(screen.getByText('$0.36 USD'));

        // We also see updates to the rendered spot details
        const UPDATED_CACHET_SPOT_MIN_QTY = '.30';
        const UPDATED_CACHET_SPOT_PRICE_MIN_BUY = '3.6k XEC';
        const UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY = '$0.11 USD';
        expect(
            screen.getByText(`${UPDATED_CACHET_SPOT_MIN_QTY} CACHET`),
        ).toBeInTheDocument();
        expect(
            screen.queryByText(UPDATED_CACHET_SPOT_PRICE_MIN_BUY),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY),
        ).toBeInTheDocument();

        const buyCachetButton = screen.getByRole('button', {
            name: 'Buy Cachet (CACHET)',
        });
        expect(buyCachetButton).toBeInTheDocument();

        // Note I was not able to adjust the slider value in react testing library
        // We do the min buy

        await userEvent.click(buyCachetButton);

        expect(
            screen.getByText(
                `Buy ${UPDATED_CACHET_SPOT_MIN_QTY} Cachet (CACHET) for 3,601.92 XEC (${UPDATED_CACHET_SPOT_PRICE_FIAT_MIN_BUY})?`,
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
    });
});
