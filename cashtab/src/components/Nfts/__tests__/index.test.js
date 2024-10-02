// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
    transvaalCacheMocks,
    argentina,
    argentinaAgoraOffer,
    mockPartial,
    mockPartialAgoraOffer,
} from 'components/Nfts/fixtures/mocks';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import { Ecc, initWasm, toHex } from 'ecash-lib';
import CashtabCache from 'config/CashtabCache';
import { cashtabCacheToJSON } from 'helpers';
import { MockAgora } from '../../../../../modules/mock-chronik-client';
import * as wif from 'wif';

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

describe('<Nfts />', () => {
    let ecc;
    beforeAll(async () => {
        await initWasm();
        ecc = new Ecc();
    });
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

        expect(
            await screen.findByText(
                'Error querying listed NFTs. Please try again later.',
            ),
        ).toBeInTheDocument();
    });
    it('We can cancel a listing and buy a listing', async () => {
        // Set expected query mocks for Agora
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([
            saturnFive.groupTokenId,
            transvaal.groupTokenId,
            mockPartial.groupTokenId,
        ]);

        // activeOffersByPubKey
        // The test wallet is selling the Saturn V NFT
        const thisPrivateKey = wif.decode(
            nftMarketWallet.paths.get(appConfig.derivationPath).wif,
        ).privateKey;
        const thisPublicKey = ecc.derivePubkey(thisPrivateKey);
        mockedAgora.setActiveOffersByPubKey(toHex(thisPublicKey), [
            saturnFiveAgoraOffer,
        ]);

        // activeOffersByGroupTokenId
        mockedAgora.setActiveOffersByGroupTokenId(saturnFive.groupTokenId, [
            saturnFiveAgoraOffer,
        ]);
        mockedAgora.setActiveOffersByGroupTokenId(transvaal.groupTokenId, [
            transvaalAgoraOffer,
            argentinaAgoraOffer,
        ]);
        mockedAgora.setActiveOffersByGroupTokenId(mockPartial.groupTokenId, [
            mockPartialAgoraOffer,
        ]);

        const mockedChronik = await initializeCashtabStateForTests(
            nftMarketWallet,
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
        // Cache your made up mock partial token and group
        yourTokenCache.tokens.set(
            mockPartial.groupTokenId,
            mockPartial.groupCache,
        );
        yourTokenCache.tokens.set(mockPartial.groupTokenId, mockPartial.cache);

        // To show that the page will load and cache the info
        // Do not cache the Transvaal flag NFT
        // Set chronik mocks so that the market listed token will be cached as expected
        mockedChronik.setMock('token', {
            input: transvaal.tokenId,
            output: transvaalCacheMocks.token,
        });
        mockedChronik.setMock('tx', {
            input: transvaal.tokenId,
            output: transvaalCacheMocks.tx,
        });

        // Cache Argentina flag NFT
        yourTokenCache.tokens.set(argentina.tokenId, argentina.cache);

        await localforage.setItem(
            'cashtabCache',
            cashtabCacheToJSON(yourTokenCache),
        );

        // Set mocks for tx that cancels a listing
        const cancelHex =
            '0200000002c0027ea8275baaca0395cfe32ab50630f0247481efa3c4ce287d8911844185dc01000000f541a81fa28c5328b16aac8995cc4662aad38ebdf785bd489cfd45746d0e54518b0b32c21450cb05391b75663573377c2509b5e37ca3fe50de0763d1ebb6b05cfa2541004cb0634c6b0000000000000000406a04534c500001410453454e4420631fd95d1c3016526f098f46fe8613b216cd1bdb4f8b8859b3ff8e9d7cadd2cc080000000000000000080000000000000001a0860100000000001976a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c6721038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de68abacffffffffb6cbe58b356b9790d0ecdf23336901ef13e28b7357533881808324aa729d020d0200000064419a9d9df78779d56e74e20ff54453701572d7d6ca7acdb221f94335c5834d010db614e7aed3320e69d115d0b35b5ded84c1b1b13bb4692184b7e88b12423eb5894121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71deffffffff030000000000000000376a04534c500001410453454e4420e2db39ade16e971afba2087bf6e29a83d7579137900eb73e5d955bdb769204bb08000000000000000122020000000000001976a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac62020000000000001976a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac00000000';
        const cancelTxid =
            '1a983c6112b8b9334a1376beee4a18dacaa0ccfe82dc2d129a27b1a46f0f507c';

        mockedChronik.setMock('broadcastTx', {
            input: cancelHex,
            output: { txid: cancelTxid },
        });

        // Set mocks for tx that buys a listing
        const buyHex =
            '0200000003d735707b78d329fbd7565fcf5e1d7eab6ae5d466877e7c26c6bd23d664044d3901000000fdb70121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71de40f936217ccef584740cc7eb47464697d78857b85b5a787747a09e3678e490c329426a5549500c3c5b6fb75d219769b92a2cf53501581dc424bd4b544ceee00f984c5ad735707b78d329fbd7565fcf5e1d7eab6ae5d466877e7c26c6bd23d664044d390100000001ac2202000000000000ffffffff85830f67e74c6b0ae670b2b7a0fa98e4f9300a00aa944ae710c9f898c5b579d300000000c10000004422020000000000001976a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac35960e00000000001976a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac514cb0634c6b0000000000000000406a04534c500001410453454e44200fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab31608000000000000000008000000000000000130750000000000001976a91481186917bb0c6997b5dbd9d1ac885ab963007ba288ac7c7eaa7801327f7701207f7588520144807c7ea86f7bbb7501c17e7c672100000000000000000000000000000000000000000000000000000000000000000068abacffffffffb6cbe58b356b9790d0ecdf23336901ef13e28b7357533881808324aa729d020d020000006441226799e83fc09f2b7fd32604a1a44f3a495e4f122b30dcde21a2c5e555bc437aa3ab9049d4a75120e010c697715742f3671587001c226a33fe2372d832a0ff4c4121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71deffffffff3a379ec70917a3a6167df4fe94dbb46f17b9f74737b3fa1dd9816f648e4ab3720200000064418fd5abee70e03ed455eec99f4e2d03b859da90970929637f7be74df91781cadc0e4ea0ae9f5c0874734c00abf20ca96235fe131e2db06dc1d78346babab541f54121038877f6adb7adbdb7ea03b431e9cd996f05f9ec684b9f1fae3dd4ab756c2f71deffffffff040000000000000000406a04534c500001410453454e44200fb781a98fffb980b1c9c609f62b29783c348e74aa7ea3908dcf7f46388ab31608000000000000000008000000000000000130750000000000001976a91481186917bb0c6997b5dbd9d1ac885ab963007ba288ac22020000000000001976a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac35960e00000000001976a9147ecc1fb4c9139badd227291299d0c58ad73f1f0888ac00000000';
        const buyTxid =
            '6dd90539964afa2dc70b226b76ef1d6e11f1e1735e7c98de894817820f597412';

        mockedChronik.setMock('broadcastTx', {
            input: buyHex,
            output: { txid: buyTxid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route="/nfts"
            />,
        );

        // The NFTs page is rendered
        expect(await screen.findByTitle('Listed NFTs')).toBeInTheDocument();

        // On load, the app shows listings for sale, not listings to manage
        const toggleNftsSwitch = screen.getByTitle('Toggle NFTs');
        expect(toggleNftsSwitch).toHaveProperty('checked', false);
        expect(
            screen.queryByText('Manage your listings'),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText('Collections on the market'),
        ).toBeInTheDocument();

        // We click the switch to see the listings we can manage
        await userEvent.click(toggleNftsSwitch);

        // Now we see listings created by this wallet
        expect(screen.getByText('Manage your listings')).toBeInTheDocument();

        // We see the listing created by this wallet under "My Listings"
        expect(
            screen.queryByText('This wallet has no listed NFTs'),
        ).not.toBeInTheDocument();
        expect(screen.getByText('Classics (CLS)')).toBeInTheDocument();

        // We see the total supply and listed supply of this collection
        expect(screen.getByText(/12 NFTs/)).toBeInTheDocument();
        expect(screen.getByText(/1 listed/)).toBeInTheDocument();

        // We can click this collection to see and manage listed NFTs in this collection
        await userEvent.click(
            screen.getByRole('button', {
                name: `See your listed NFTs from the ${saturnFive.groupCache.genesisInfo.tokenName} collection`,
            }),
        );

        // We see the BrowseCollection modal for managing NFTs in this group
        expect(
            screen.getByText('Manage your NFTs in Classics'),
        ).toBeInTheDocument();

        // We see the Saturn V listing
        expect(
            screen.getByText(`${saturnFive.cache.genesisInfo.tokenName}`),
        ).toBeInTheDocument();
        // We see the price in USD
        expect(screen.getByText(/\$ 0.03/)).toBeInTheDocument();

        // We can click to manage this listing
        await userEvent.click(
            screen.getByRole('button', {
                name: `Manage ${saturnFive.tokenId}`,
            }),
        );

        // We see the "Manage my listed NFT" modal
        expect(screen.getByText(/Manage my listed NFT/)).toBeInTheDocument();
        // This modal shows the price in XEC (whereas before we only saw fiat)
        expect(screen.getByText(/1,000 XEC/)).toBeInTheDocument();

        // If we click cancel, we get confirmation options
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Cancel Listing',
            }),
        );
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();

        // Cancel it for real
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Cancel this listing',
            }),
        );

        // The Manage Listing modal closes
        expect(
            screen.queryByText('Manage my listed NFT'),
        ).not.toBeInTheDocument();

        // We get a toastify notification that the listing is canceled
        expect(screen.getByText('Canceled listing')).toBeInTheDocument();

        // Note - we cannot test that the listing has disappeared, because we can only
        // set chronik mocks once. Would need integration testing with regtest or
        // support for multiple calls in mock-chronik-client to test this
        // Expected behavior in app is that the listing would disappear from "My Listings"
        // but this is not expected to happen in the test

        // We click the toggle NFTs switch again to see the listings we can buy
        await userEvent.click(toggleNftsSwitch);

        // Now we see listings NOT created by this wallet
        expect(
            screen.getByText('Collections on the market'),
        ).toBeInTheDocument();

        // We see a listing not created by this wallet under "NFTs for sale"
        expect(
            screen.queryByText('No NFTs are currently listed for sale'),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText(
                `${transvaal.groupCache.genesisInfo.tokenName} (${transvaal.groupCache.genesisInfo.tokenTicker})`,
            ),
        ).toBeInTheDocument();

        // Note that we DO NOT see our mock partial group listed, since it contained no ONESHOT offers
        expect(
            screen.queryByText(
                `${mockPartial.groupCache.genesisInfo.tokenName} (${mockPartial.groupCache.genesisInfo.tokenTicker})`,
            ),
        ).not.toBeInTheDocument();

        // We see the total supply and listed supply of this collection
        expect(screen.getByText(/190 NFTs/)).toBeInTheDocument();
        expect(screen.getByText(/2 listed/)).toBeInTheDocument();

        // We can click this collection to see and manage listed NFTs in this collection
        await userEvent.click(
            screen.getByRole('button', {
                name: `See listed NFTs from the ${transvaal.groupCache.genesisInfo.tokenName} collection`,
            }),
        );

        // We see the BrowseCollection modal for buying NFTs in this group
        expect(
            screen.getByText(
                `Listed NFTs in "${transvaal.groupCache.genesisInfo.tokenName}"`,
            ),
        ).toBeInTheDocument();

        // We see the Transvaal listing
        expect(
            screen.getByText(`${transvaal.cache.genesisInfo.tokenName}`),
        ).toBeInTheDocument();
        // We see the price in USD
        expect(screen.getByText(/\$ 0.03/)).toBeInTheDocument();

        // We can click to bring up the Buy action modal for this listing
        await userEvent.click(
            screen.getByRole('button', {
                name: `Buy ${transvaal.tokenId}`,
            }),
        );

        // We see the "buy this NFT" modal"
        expect(screen.getByText('Buy this NFT')).toBeInTheDocument();

        // We see the price in XEC
        expect(screen.getByText('64,872 XEC')).toBeInTheDocument();

        // If we click Buy, we get confirmation options
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Buy',
            }),
        );
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();

        // Try to buy it
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Buy now',
            }),
        );

        // The Buy Listing modal closes
        expect(screen.queryByText('Buy this NFT')).not.toBeInTheDocument();

        // We get a toastify error notification because we can't afford it
        expect(
            screen.getByText('Error: Insufficient funds'),
        ).toBeInTheDocument();

        // We check out a more affordable NFT
        await userEvent.click(
            screen.getByRole('button', {
                name: `Buy ${argentina.tokenId}`,
            }),
        );

        // We see the "buy this NFT" modal"
        expect(screen.getByText('Buy this NFT')).toBeInTheDocument();

        // We see the price in XEC
        expect(screen.getByText('300 XEC')).toBeInTheDocument();

        // If we click Buy, we get confirmation options
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Buy',
            }),
        );
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();

        // Try to buy it
        await userEvent.click(
            screen.getByRole('button', {
                name: 'Buy now',
            }),
        );

        // The Buy Listing modal closes
        expect(screen.queryByText('Buy this NFT')).not.toBeInTheDocument();

        // We bought it
        expect(screen.getByText('Bought NFT')).toBeInTheDocument();
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
        const thisPrivateKey = wif.decode(
            nftMarketWallet.paths.get(appConfig.derivationPath).wif,
        ).privateKey;
        const thisPublicKey = ecc.derivePubkey(thisPrivateKey);
        mockedAgora.setActiveOffersByPubKey(toHex(thisPublicKey), [
            saturnFiveAgoraOffer,
        ]);
        // Also set activeOffersByPubKey for the wallet you are switching to
        const nextPrivateKey = wif.decode(
            walletWithXecAndTokens.paths.get(appConfig.derivationPath).wif,
        ).privateKey;
        const nextPublicKey = ecc.derivePubkey(nextPrivateKey);
        mockedAgora.setActiveOffersByPubKey(toHex(nextPublicKey), []);

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

        // The NFTs page is rendered
        expect(await screen.findByTitle('Listed NFTs')).toBeInTheDocument();

        // On load, the app shows listings for sale, not listings to manage
        const toggleNftsSwitch = screen.getByTitle('Toggle NFTs');
        expect(toggleNftsSwitch).toHaveProperty('checked', false);
        expect(
            screen.queryByText('Manage your listings'),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText('Collections on the market'),
        ).toBeInTheDocument();

        // NFTs not created by this wallet are displayed
        expect(
            screen.getByRole('button', {
                name: `See listed NFTs from the Flags collection`,
            }),
        ).toBeInTheDocument();

        // We click the switch to see the listings we can manage
        await userEvent.click(toggleNftsSwitch);

        // We see the listing created by this wallet under "My Listings"
        expect(
            screen.queryByText('You do not have any listed NFTs'),
        ).not.toBeInTheDocument();

        // We see expected button to manage NFTs in our Classics collection
        expect(
            screen.getByRole('button', {
                name: `See your listed NFTs from the Classics collection`,
            }),
        ).toBeInTheDocument();

        // Change wallets using the dropdown menu at the top of the screen
        await userEvent.selectOptions(
            screen.getByTestId('wallet-select'),
            screen.getByText('Transaction Fixtures'),
        );

        expect(await screen.findByText('9,513.12 XEC')).toBeInTheDocument();

        // Wait for tokens to re-load (triggered by wallet change)
        await waitFor(() =>
            expect(
                screen.queryByTitle('Loading tokens'),
            ).not.toBeInTheDocument(),
        );
        expect(await screen.findByTitle('Listed NFTs')).toBeInTheDocument();

        // The switch is still set to Manage Listings, so we do not see buy listings
        expect(toggleNftsSwitch).toHaveProperty('checked', true);
        expect(screen.getByText('Manage your listings')).toBeInTheDocument();
        expect(
            screen.queryByText('Collections on the market'),
        ).not.toBeInTheDocument();

        // Now we have no listings to manage as the new wallet did not create these listings
        expect(
            screen.getByText('You do not have any listed NFTs'),
        ).toBeInTheDocument();

        // We have no option to see our own listed NFTs as before
        expect(
            screen.queryByRole('button', {
                name: `See your listed NFTs from the Classics collection`,
            }),
        ).not.toBeInTheDocument();

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
            await screen.findByText('Collections on the market'),
        ).toBeInTheDocument();

        // All NFTs are available to buy
        expect(
            screen.getByRole('button', {
                name: `See listed NFTs from the Flags collection`,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', {
                name: `See listed NFTs from the Classics collection`,
            }),
        ).toBeInTheDocument();
    });
});
