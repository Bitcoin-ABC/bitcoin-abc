// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import {
    nftMarketWallet,
    saturnFive,
    saturnFiveAgoraOffer,
    transvaal,
    transvaalAgoraOffer,
    argentina,
    argentinaAgoraOffer,
} from 'components/Nfts/fixtures/mocks';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import { Ecc, toHex } from 'ecash-lib';
import CashtabCache from 'config/CashtabCache';
import { cashtabCacheToJSON } from 'helpers';
import { MockAgora } from '../../../../../modules/mock-chronik-client';

describe('<Nfts />', () => {
    const ecc = new Ecc();
    beforeEach(() => {
        // Mock the fetch call for Cashtab's price API
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
    it('A chronik error in agora queries displays expected error msg', async () => {
        // Set expected query mocks for Agora
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds(new Error('some chronik error'));

        const mockedChronik = await initializeCashtabStateForTests(
            nftMarketWallet,
            localforage,
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route="/nfts"
            />,
        );

        // After getting an agora error, we render the expected notice
        expect(
            await screen.findByText(
                'Error querying listed NFTs. Please try again later.',
            ),
        ).toBeInTheDocument();
    });
    it('No listing msgs render if we have no listings', async () => {
        // Set expected query mocks for Agora
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        mockedAgora.setActiveOffersByPubKey(
            toHex(nftMarketWallet.paths.get(appConfig.derivationPath).pk),
            [],
        );

        const mockedChronik = await initializeCashtabStateForTests(
            nftMarketWallet,
            localforage,
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route="/nfts"
            />,
        );

        // We see a spinner while we query agora for listed collections
        expect(screen.getByTitle('Cashtab Loading')).toBeInTheDocument();

        // After successfully loading offers, there are none
        expect(
            await screen.findByText('Listed Collections'),
        ).toBeInTheDocument();
        expect(
            await screen.findByText('No listed collections'),
        ).toBeInTheDocument();

        // The screen loads showing listed collections not created by this wallet
        const toggleNftsSwitch = screen.getByTitle('Toggle NFTs');
        expect(toggleNftsSwitch).toHaveProperty('checked', false);
        await userEvent.click(toggleNftsSwitch);
        expect(
            screen.getByText('Manage Your NFT Listings'),
        ).toBeInTheDocument();
        expect(screen.getByText('You have no listed NFTs')).toBeInTheDocument();
    });
    it('If we switch wallets, listings that were previously organized as "My Listing" are instead organized as for sale', async () => {
        // Set expected query mocks for Agora
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([
            saturnFive.groupTokenId,
            transvaal.groupTokenId,
        ]);

        // activeOffersByPubKey
        // The test wallet is selling the Saturn V NFT
        mockedAgora.setActiveOffersByPubKey(
            toHex(nftMarketWallet.paths.get(appConfig.derivationPath).pk),
            [saturnFiveAgoraOffer],
        );

        // Also set activeOffersByPubKey for the wallet you are switching to
        mockedAgora.setActiveOffersByPubKey(
            toHex(
                walletWithXecAndTokens.paths.get(appConfig.derivationPath).pk,
            ),
            [],
        );

        // activeOffersByGroupTokenId
        mockedAgora.setActiveOffersByGroupTokenId(saturnFive.groupTokenId, [
            saturnFiveAgoraOffer,
        ]);
        mockedAgora.setActiveOffersByGroupTokenId(transvaal.groupTokenId, [
            transvaalAgoraOffer,
            argentinaAgoraOffer,
        ]);

        const mockedChronik = await initializeCashtabStateForTests(
            [nftMarketWallet, walletWithXecAndTokens],
            localforage,
        );

        // Mock token cache
        const yourTokenCache = new CashtabCache();
        // Cache the Saturn V group
        yourTokenCache.tokens.set(
            saturnFive.groupTokenId,
            saturnFive.groupCache,
        );

        // Cache the Saturn V NFT
        yourTokenCache.tokens.set(saturnFive.tokenId, saturnFive.cache);
        // Cache the Transvaal NFT's group, Flags
        yourTokenCache.tokens.set(transvaal.groupTokenId, transvaal.groupCache);
        // Cache Transvaal flag NFT
        yourTokenCache.tokens.set(transvaal.tokenId, transvaal.cache);
        // Cache Argentina flag NFT
        yourTokenCache.tokens.set(argentina.tokenId, argentina.cache);
        await localforage.setItem(
            'cashtabCache',
            cashtabCacheToJSON(yourTokenCache),
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route="/nfts"
            />,
        );

        // We see a spinner while we query agora for listed collections
        expect(screen.getByTitle('Cashtab Loading')).toBeInTheDocument();
        // We see a "loading" spinner for each Collection component as it renders
        expect((await screen.findAllByTitle('Loading'))[0]).toBeInTheDocument();

        // After successfully loading offers, we see the expected heading for listed collections
        expect(
            await screen.findByText('Listed Collections'),
        ).toBeInTheDocument();

        // On load, the app shows listings for sale, not listings to manage
        const toggleNftsSwitch = screen.getByTitle('Toggle NFTs');
        expect(toggleNftsSwitch).toHaveProperty('checked', false);

        // We see offered collections, but not their listings
        expect(await screen.findByText('Classics (CLS)')).toBeInTheDocument();
        expect(await screen.findByText('Flags (FLAGS)')).toBeInTheDocument();

        // We click the switch to see the listings we can manage
        await userEvent.click(toggleNftsSwitch);

        // We have toggled to the Manage screen
        expect(
            screen.getByText('Manage Your NFT Listings'),
        ).toBeInTheDocument();

        // We see the listing created by this wallet under "My Listings"
        expect(
            screen.queryByText('You have no listed NFTs'),
        ).not.toBeInTheDocument();

        // We see the NFT name for manage swiper, not the collection name
        expect(await screen.findByText('Saturn V (S5)')).toBeInTheDocument();

        // Change wallets using the dropdown menu at the top of the screen
        await userEvent.selectOptions(
            screen.getByTestId('wallet-select'),
            screen.getByText('Transaction Fixtures'),
        );

        // Wait for the wallet to load
        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        // The switch is still set to Manage Listings, so we do not see buy listings
        expect(toggleNftsSwitch).toHaveProperty('checked', true);

        // Now we have no listings to manage as the new wallet did not create these listings
        expect(
            await screen.findByText('You have no listed NFTs'),
        ).toBeInTheDocument();

        // We click the switch to see the listings we can buy
        // Note, for some reason related to the testing lib,
        // if we use the var "toggleNftsSwitch" here,
        // we don't get the same switch
        await userEvent.click(screen.getByTitle('Toggle NFTs'));
        expect(screen.getByTitle('Toggle NFTs')).toHaveProperty(
            'checked',
            false,
        );

        // Now we see listed NFTs not created by this wallet
        expect(
            await screen.findByText('Listed Collections'),
        ).toBeInTheDocument();

        // All NFTs are available to buy
        expect(await screen.findByText('Classics (CLS)')).toBeInTheDocument();
        expect(await screen.findByText('Flags (FLAGS)')).toBeInTheDocument();
    });
});
