// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { render, screen } from '@testing-library/react';
import CashtabCache from 'config/CashtabCache';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import 'fake-indexeddb/auto';
import {
    agoraPartialAlphaWallet,
    agoraPartialAlphaKeypair,
    agoraPartialBetaWallet,
    agoraPartialBetaKeypair,
    heismanCollectionGroupTokenId,
    CollectionTestCache,
    SettingsUsd,
    heismanNftOneOffer,
    heismanCollectionCacheMocks,
    lkCacheMocks,
} from 'components/Agora/fixtures/mocks';
import { Ecc } from 'ecash-lib';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../../modules/mock-chronik-client';
import Collection from 'components/Agora/Collection/';
import { Bounce, ToastContainer } from 'react-toastify';

/**
 * Test expected behavior of the Collection component
 */
describe('<Collection />', () => {
    const ecc = new Ecc();

    let mockedChronik;
    const FIAT_PRICE = 0.00003;
    const CHAINTIPBLOCKHEIGHT = 800000;
    beforeEach(async () => {
        mockedChronik = new MockChronikClient();
    });
    afterEach(async () => {
        jest.clearAllMocks();
    });
    it('We render expected msg if no agora ONESHOT offers are found for this collection', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByGroupTokenId(
            heismanCollectionGroupTokenId,
            [],
        );

        render(
            <ThemeProvider theme={theme}>
                <Collection
                    groupTokenId={heismanCollectionGroupTokenId}
                    agora={mockedAgora}
                    chronik={mockedChronik}
                    cashtabCache={CollectionTestCache}
                    settings={SettingsUsd}
                    fiatPrice={FIAT_PRICE}
                    userLocale={'en-US'}
                    wallet={agoraPartialAlphaWallet}
                    activePk={agoraPartialAlphaKeypair.pk}
                    chaintipBlockheight={CHAINTIPBLOCKHEIGHT}
                />
            </ThemeProvider>,
        );

        // We see the collection tokenId immediately
        expect(
            screen.getByAltText(`icon for ${heismanCollectionGroupTokenId}`),
        ).toBeInTheDocument();

        // We see the collection name immediately as it is in cache
        expect(screen.getByText('The Heisman (HSM)')).toBeInTheDocument();

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // After offers load, we see a notice that there are no active offers
        expect(
            await screen.findByText('No active offers in this collection'),
        ).toBeInTheDocument();
    });
    it('We render expected alert if we have an error querying agora ONESHOT offers for this collection', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByGroupTokenId(
            heismanCollectionGroupTokenId,
            new Error('some query error'),
        );

        render(
            <ThemeProvider theme={theme}>
                <Collection
                    groupTokenId={heismanCollectionGroupTokenId}
                    agora={mockedAgora}
                    chronik={mockedChronik}
                    cashtabCache={CollectionTestCache}
                    settings={SettingsUsd}
                    fiatPrice={FIAT_PRICE}
                    userLocale={'en-US'}
                    wallet={agoraPartialAlphaWallet}
                    activePk={agoraPartialAlphaKeypair.pk}
                    chaintipBlockheight={CHAINTIPBLOCKHEIGHT}
                />
            </ThemeProvider>,
        );

        // We see the collection tokenId immediately
        expect(
            screen.getByAltText(`icon for ${heismanCollectionGroupTokenId}`),
        ).toBeInTheDocument();

        // We see the collection name immediately as it is in cache
        expect(screen.getByText('The Heisman (HSM)')).toBeInTheDocument();

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // After offers load, we see a notice that there are no active offers
        expect(
            await screen.findByText('Error querying agora offers'),
        ).toBeInTheDocument();
    });
    it('We can cache and render a collection and offered NFT in that collection', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByGroupTokenId(
            heismanCollectionGroupTokenId,
            [heismanNftOneOffer],
        );

        for (const tokenCacheMock of [
            heismanCollectionCacheMocks,
            lkCacheMocks,
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

        // Must include ToastContainer to test notification
        render(
            <ThemeProvider theme={theme}>
                <ToastContainer
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
                <Collection
                    groupTokenId={heismanCollectionGroupTokenId}
                    agora={mockedAgora}
                    chronik={mockedChronik}
                    cashtabCache={new CashtabCache()}
                    settings={SettingsUsd}
                    fiatPrice={FIAT_PRICE}
                    userLocale={'en-US'}
                    wallet={agoraPartialAlphaWallet}
                    activePk={agoraPartialAlphaKeypair.pk}
                    chaintipBlockheight={CHAINTIPBLOCKHEIGHT}
                />
            </ThemeProvider>,
        );

        // We see the collection tokenId immediately
        expect(
            screen.getByAltText(`icon for ${heismanCollectionGroupTokenId}`),
        ).toBeInTheDocument();

        // We see multiple spinners; one for loading active offer, others for loading token names
        expect(screen.getAllByTitle('Loading')[0]).toBeInTheDocument();

        // We see the collection name after it is cached
        expect(
            await screen.findByText('The Heisman (HSM)'),
        ).toBeInTheDocument();

        // After loading, we see the NFT name for the active offer
        expect(
            await screen.findByText('Larry Kelley (LK)'),
        ).toBeInTheDocument();

        // After offers load, we DO NOT see a notice that there are no active offers
        expect(
            screen.queryByText('No active offers in this collection'),
        ).not.toBeInTheDocument();

        // We see the formatted fiat price
        expect(screen.getByText('$1,500.00 USD')).toBeInTheDocument();
        // We see a cancel button as this wallet created this offer
        const cancelButton = screen.getByRole('button', {
            name: 'Cancel Larry Kelley (LK)',
        });
        expect(cancelButton).toBeInTheDocument();
    });
    it('We DO NOT cache and render offered NFTs until user clicks, if loadOnClick prop is set', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByGroupTokenId(
            heismanCollectionGroupTokenId,
            [heismanNftOneOffer],
        );

        for (const tokenCacheMock of [
            heismanCollectionCacheMocks,
            lkCacheMocks,
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

        // Must include ToastContainer to test notification
        render(
            <ThemeProvider theme={theme}>
                <ToastContainer
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
                <Collection
                    groupTokenId={heismanCollectionGroupTokenId}
                    agora={mockedAgora}
                    chronik={mockedChronik}
                    cashtabCache={new CashtabCache()}
                    settings={SettingsUsd}
                    fiatPrice={FIAT_PRICE}
                    userLocale={'en-US'}
                    wallet={agoraPartialAlphaWallet}
                    activePk={agoraPartialAlphaKeypair.pk}
                    chaintipBlockheight={CHAINTIPBLOCKHEIGHT}
                    loadOnClick
                />
            </ThemeProvider>,
        );

        // We see the collection tokenId immediately
        expect(
            screen.getByAltText(`icon for ${heismanCollectionGroupTokenId}`),
        ).toBeInTheDocument();

        // We see multiple spinners; one for loading active offer, others for loading token names
        expect(screen.getAllByTitle('Loading')[0]).toBeInTheDocument();

        // We see the collection name after it is cached
        expect(
            await screen.findByText('The Heisman (HSM)'),
        ).toBeInTheDocument();

        // We can click the title to load the NFT
        const expandButton = screen.getByRole('button', { name: /Heisman/ });
        await userEvent.click(expandButton);

        // Now we see the NFT info, when it loads
        expect(
            await screen.findByText('Larry Kelley (LK)'),
        ).toBeInTheDocument();

        // We see the formatted fiat price
        expect(screen.getByText('$1,500.00 USD')).toBeInTheDocument();
        // We see a cancel button as this wallet created this offer
        const cancelButton = screen.getByRole('button', {
            name: 'Cancel Larry Kelley (LK)',
        });
        expect(cancelButton).toBeInTheDocument();
    });
    it('We can render and cancel our own listing', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByGroupTokenId(
            heismanCollectionGroupTokenId,
            [heismanNftOneOffer],
        );

        const mockCancelHex =
            '0200000002f7bb552354b6f5076eb2664a8bcbbedc87b42f2ebfcb1480ee0a9141bbae63590000000064418bcbcf63745390a2ccc2a64657dc269db9dabb0e37faf002959ee4b10c688ec944d169e3cab07ab284e2962f97036c864390dd6cd14abfec9064b11529a3221a41210233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afdffffffff404b7bf6dde0308d82d627850eb1a3a2fca61f3275be83b6d579c47ed2550ed301000000f5414687cc36c08199e2f3bb4f36c91d7c54000f764b7fe4503311dbcb3080e64555fb718d12ba26b434c8dcbf511f14ac27c141bb834a0fa475613dc70dee4504ac41004cb0634c6b0000000000000000406a04534c500001410453454e4420be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c08000000000000000008000000000000000100f2052a010000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c67210233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afd68abacffffffff030000000000000000376a04534c500001410453454e4420be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c08000000000000000122020000000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac67660600000000001976a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac00000000';
        const mockCancelTxid =
            'df0737a3f86e8761e1b00197935c49b8589e20320ced101d640b874f7cded2b2';
        mockedChronik.setBroadcastTx(mockCancelHex, mockCancelTxid);

        // Must include ToastContainer to test notification
        render(
            <ThemeProvider theme={theme}>
                <ToastContainer
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
                <Collection
                    groupTokenId={heismanCollectionGroupTokenId}
                    agora={mockedAgora}
                    chronik={mockedChronik}
                    cashtabCache={CollectionTestCache}
                    settings={SettingsUsd}
                    fiatPrice={FIAT_PRICE}
                    userLocale={'en-US'}
                    wallet={agoraPartialAlphaWallet}
                    activePk={agoraPartialAlphaKeypair.pk}
                    chaintipBlockheight={CHAINTIPBLOCKHEIGHT}
                />
            </ThemeProvider>,
        );

        // We see the collection tokenId immediately
        expect(
            screen.getByAltText(`icon for ${heismanCollectionGroupTokenId}`),
        ).toBeInTheDocument();

        // We see the collection name immediately as it is in cache
        expect(screen.getByText('The Heisman (HSM)')).toBeInTheDocument();

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // After loading, we see the NFT name for the active offer
        expect(
            await screen.findByText('Larry Kelley (LK)'),
        ).toBeInTheDocument();
        // After offers load, we DO NOT see a notice that there are no active offers
        expect(
            screen.queryByText('No active offers in this collection'),
        ).not.toBeInTheDocument();
        // We see the formatted fiat price
        expect(screen.getByText('$1,500.00 USD')).toBeInTheDocument();
        // We see a cancel button as this wallet created this offer
        const cancelButton = screen.getByRole('button', {
            name: 'Cancel Larry Kelley (LK)',
        });
        expect(cancelButton).toBeInTheDocument();

        // Cancel
        await userEvent.click(cancelButton);

        screen.getByText('Cancel this listing?');
        await userEvent.click(screen.getByText('OK'));
        expect(await screen.findByText('Canceled listing')).toBeInTheDocument();

        // This offer is removed from activeOffers, leaving no offers left
        expect(
            await screen.findByText('No active offers in this collection'),
        ).toBeInTheDocument();
    });
    it('We can render and buy a listing', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByGroupTokenId(
            heismanCollectionGroupTokenId,
            [heismanNftOneOffer],
        );

        const mockBuyHex =
            '0200000002f327f712cf7e629089daa7e76aa6a22d695f09a8019cd6fce640f5d044d2114700000000644176b288e2343af4e8e2420d29aa16571eed88e05b30519f452eaddae4538f5ba2c59408cc58bd367458a8632e36dc7d969588040529c3e61b796467b4f3a6ab574121021e75febb8ae57a8805e80df93732ab7d5d8606377cb30c0f02444809cc085f39ffffffff404b7bf6dde0308d82d627850eb1a3a2fca61f3275be83b6d579c47ed2550ed301000000fd950121023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b140ea428c8709da0aa9a3f3c9e159347b63d813f4c821f8b33ceea43962ab616ef9fd663847058af843fb18e6837669dde335066ed5aacb4ef45882f50f81b371cf4c5a404b7bf6dde0308d82d627850eb1a3a2fca61f3275be83b6d579c47ed2550ed30100000001ac2202000000000000fffffffffc9d8ea3c199bf5bb3c08676d4c6aa244aa4f228b0df15847db7f0458f0031d300000000c10000002222020000000000001976a914f208ef75eb0dd778ea4540cbd966a830c7b94bb088ac514cb0634c6b0000000000000000406a04534c500001410453454e4420be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c08000000000000000008000000000000000100f2052a010000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c67210233f09cd4dc3381162f09975f90866f085350a5ec890d7fba5f6739c9c0ac2afd68abacffffffff030000000000000000406a04534c500001410453454e4420be095430a16a024134bea079f235bcd2f79425c42659f9346416f626671f371c08000000000000000008000000000000000100f2052a010000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a914f208ef75eb0dd778ea4540cbd966a830c7b94bb088ac00000000';
        const mockBuyTxid =
            '031e3291025cf485ec707f9ada7cb6229cb5a23fbcc4fec9c3f6a937d2e52913';
        mockedChronik.setBroadcastTx(mockBuyHex, mockBuyTxid);

        // Need to juice the wallet with a big utxo as this NFT is $$$
        const affordItUTxo = {
            outpoint: {
                txid: '4711d244d0f540e6fcd69c01a8095f692da2a66ae7a7da8990627ecf12f727f3',
                outIdx: 0,
            },
            blockHeight: -1,
            isCoinbase: false,
            value: 5000001488,
            isFinal: false,
            path: 1899,
        };

        // Must include ToastContainer to test notification
        render(
            <ThemeProvider theme={theme}>
                <ToastContainer
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
                <Collection
                    groupTokenId={heismanCollectionGroupTokenId}
                    agora={mockedAgora}
                    chronik={mockedChronik}
                    cashtabCache={CollectionTestCache}
                    settings={SettingsUsd}
                    fiatPrice={FIAT_PRICE}
                    userLocale={'en-US'}
                    wallet={{
                        ...agoraPartialBetaWallet,
                        state: {
                            ...agoraPartialBetaWallet.state,
                            nonSlpUtxos: [affordItUTxo],
                        },
                    }}
                    activePk={agoraPartialBetaKeypair.pk}
                    chaintipBlockheight={CHAINTIPBLOCKHEIGHT}
                />
            </ThemeProvider>,
        );

        // We see the collection tokenId immediately
        expect(
            screen.getByAltText(`icon for ${heismanCollectionGroupTokenId}`),
        ).toBeInTheDocument();

        // We see the collection name immediately as it is in cache
        expect(screen.getByText('The Heisman (HSM)')).toBeInTheDocument();

        // We see a spinner while activeOffers load
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // After loading, we see the NFT name for the active offer
        expect(
            await screen.findByText('Larry Kelley (LK)'),
        ).toBeInTheDocument();
        // After offers load, we DO NOT see a notice that there are no active offers
        expect(
            screen.queryByText('No active offers in this collection'),
        ).not.toBeInTheDocument();
        // We see the formatted fiat price
        expect(screen.getByText('$1,500.00 USD')).toBeInTheDocument();
        // We see a Buy button as this wallet did not create this offer
        const buyButton = screen.getByRole('button', {
            name: 'Buy Larry Kelley (LK)',
        });
        expect(buyButton).toBeInTheDocument();

        // Buy
        await userEvent.click(buyButton);

        screen.getByText('Buy this listing?');
        await userEvent.click(screen.getByText('OK'));
        expect(
            await screen.findByText(
                'Bought Larry Kelley (LK) for $1,500.00 USD',
            ),
        ).toBeInTheDocument();

        // This offer is removed from activeOffers, leaving no offers left
        expect(
            await screen.findByText('No active offers in this collection'),
        ).toBeInTheDocument();
    });
});
