// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { when } from 'jest-when';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import appConfig from 'config/app';
import { token as tokenConfig } from 'config/token';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { FEE_SATS_PER_KB_CASHTAB_LEGACY } from 'constants/transactions';
import {
    tokenTestWallet,
    supportedTokens,
    slp1FixedMocks,
    slp1NftParentMocks,
    slp1NftChildMocks,
    xecxMocks,
    firmaMocks,
} from 'components/Etokens/fixtures/mocks';
import { Ecc } from 'ecash-lib';
import { MockAgora } from '../../../../../modules/mock-chronik-client';

/**
 * Agora action deep links on the token screen.
 * See doc/standards/agora-deeplink.md
 *
 * A deep link is only an intent. Cashtab validates the token and the action.
 * LIST prefills the sell form; BUY opens the DeepLinkBuy confirm screen (not
 * the OrderBook). Cashtab never auto-lists, auto-buys, or signs from a deep
 * link, so a crafted link cannot move funds or create an offer.
 */
describe('<Token /> rendered with params in URL', () => {
    const ecc = new Ecc();
    let mockedChronik;
    let mockAgora;

    const NFT_PRICE_PLACEHOLDER = 'Enter NFT list price';
    const SLP_PRICE_PLACEHOLDER = 'Enter list price (per token)';

    const renderToken = route =>
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route={route}
            />,
        );

    /** Wait for the token screen to have loaded this token's info */
    const awaitTokenLoad = async tokenMock => {
        const { tokenName } = tokenMock.token.genesisInfo;
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();
    };

    beforeEach(async () => {
        const mockedDate = new Date('2022-01-01T12:00:00.000Z');
        jest.spyOn(global, 'Date').mockImplementation(() => mockedDate);

        mockAgora = new MockAgora();

        mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY,
        });

        // Build chronik mocks that Cashtab would use to add token info to cache
        for (const tokenMock of supportedTokens) {
            mockedChronik.setToken(tokenMock.tokenId, tokenMock.token);
            mockedChronik.setTx(tokenMock.tokenId, tokenMock.tx);
            mockedChronik.setUtxosByTokenId(tokenMock.tokenId, tokenMock.utxos);
            // Set empty tx history to mock no existing NFTs
            mockedChronik.setTxHistoryByTokenId(tokenMock.tokenId, []);
            // No active agora offers for any token in these tests
            mockAgora.setActiveOffersByTokenId(tokenMock.tokenId, []);
        }

        // Mock the fetch call to Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd';
        const cryptoId = appConfig.coingeckoId;
        const priceApiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${fiatCode}&include_last_updated_at=true`;
        const priceResponse = {
            ecash: { usd: 0.00003, last_updated_at: 1706644626 },
        };
        when(fetch)
            .calledWith(priceApiUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(priceResponse),
            });
    });

    afterEach(async () => {
        // restoreAllMocks undoes the spyOn(Date) so the fixed clock does not
        // leak into later tests; clearAllMocks alone would not.
        jest.restoreAllMocks();
        await clearLocalForage(localforage);
    });

    it('LIST. An NFT with a valid price opens the sell form with the price prefilled.', async () => {
        renderToken(
            `/token/${slp1NftChildMocks.tokenId}?action=LIST&price=5000`,
        );

        await awaitTokenLoad(slp1NftChildMocks);

        // The sell form is open without any user interaction
        const priceInput = await screen.findByPlaceholderText(
            NFT_PRICE_PLACEHOLDER,
        );
        // and the valid price is prefilled
        await waitFor(() => expect(priceInput.value).toBe('5000'));
    });

    it('LIST. An NFT with no price param opens the sell form with an empty price.', async () => {
        renderToken(`/token/${slp1NftChildMocks.tokenId}?action=LIST`);

        await awaitTokenLoad(slp1NftChildMocks);

        const priceInput = await screen.findByPlaceholderText(
            NFT_PRICE_PLACEHOLDER,
        );
        expect(priceInput.value).toBe('');
    });

    it('LIST. An invalid price is not prefilled, but the sell form still opens.', async () => {
        // 'notanumber' fails the same validation the manual list form uses
        renderToken(
            `/token/${slp1NftChildMocks.tokenId}?action=LIST&price=notanumber`,
        );

        await awaitTokenLoad(slp1NftChildMocks);

        const priceInput = await screen.findByPlaceholderText(
            NFT_PRICE_PLACEHOLDER,
        );
        expect(priceInput.value).toBe('');
    });

    it('LIST. A quantity param is refused (quantity is a BUY parameter).', async () => {
        renderToken(
            `/token/${slp1NftChildMocks.tokenId}?action=LIST&price=5000&quantity=1`,
        );

        await awaitTokenLoad(slp1NftChildMocks);

        expect(
            await screen.findByText(/list link cannot specify a quantity/),
        ).toBeInTheDocument();
        // Sell form must not open
        expect(
            screen.queryByPlaceholderText(NFT_PRICE_PLACEHOLDER),
        ).not.toBeInTheDocument();
    });

    it('LIST. A fungible SLP token with a valid price prefills the partial list price.', async () => {
        renderToken(`/token/${slp1FixedMocks.tokenId}?action=LIST&price=10`);

        await awaitTokenLoad(slp1FixedMocks);

        const priceInput = await screen.findByPlaceholderText(
            SLP_PRICE_PLACEHOLDER,
        );
        await waitFor(() => expect(priceInput.value).toBe('10'));
    });

    it('LIST. The action param is case insensitive.', async () => {
        renderToken(
            `/token/${slp1NftChildMocks.tokenId}?action=list&price=5000`,
        );

        await awaitTokenLoad(slp1NftChildMocks);

        const priceInput = await screen.findByPlaceholderText(
            NFT_PRICE_PLACEHOLDER,
        );
        await waitFor(() => expect(priceInput.value).toBe('5000'));
    });

    it('LIST. An NFT collection cannot be listed, so no sell form is opened.', async () => {
        renderToken(
            `/token/${slp1NftParentMocks.tokenId}?action=LIST&price=5000`,
        );

        await awaitTokenLoad(slp1NftParentMocks);

        // We tell the user this token cannot be listed
        expect(await screen.findByText(/cannot be listed/)).toBeInTheDocument();

        // and no list price field is rendered
        expect(
            screen.queryByPlaceholderText(NFT_PRICE_PLACEHOLDER),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(SLP_PRICE_PLACEHOLDER),
        ).not.toBeInTheDocument();
    });

    it('LIST is refused for a blacklisted token.', async () => {
        // Mark this token blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${slp1NftChildMocks.tokenId}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: true }),
            });

        renderToken(
            `/token/${slp1NftChildMocks.tokenId}?action=LIST&price=5000`,
        );

        // Cashtab shows the blacklist notice and does not open the sell form
        expect(
            await screen.findByText(/does not support trading this token/),
        ).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(NFT_PRICE_PLACEHOLDER),
        ).not.toBeInTheDocument();
    });

    it('LIST opens the partial list form for XECX, matching its List token UI action.', async () => {
        // XECX is primarily redeemed (its Sell button is Redeem), but the UI
        // also offers listing it on Agora via the "List token" dropdown item,
        // so a LIST deep link maps to the same sellSlp flow, prefilled
        renderToken(`/token/${xecxMocks.tokenId}?action=LIST&price=5000`);

        const priceInput = await screen.findByPlaceholderText(
            SLP_PRICE_PLACEHOLDER,
        );
        await waitFor(() => expect(priceInput.value).toBe('5000'));
    });

    it('LIST opens the partial list form for Firma, matching its List token UI action.', async () => {
        renderToken(`/token/${firmaMocks.tokenId}?action=LIST&price=5000`);

        const priceInput = await screen.findByPlaceholderText(
            SLP_PRICE_PLACEHOLDER,
        );
        await waitFor(() => expect(priceInput.value).toBe('5000'));
    });

    it('BUY opens the deep-link confirm screen for XECX (not the OrderBook).', async () => {
        renderToken(`/token/${xecxMocks.tokenId}?action=BUY`);

        // Dedicated DeepLinkBuy confirm UI — not the OrderBook
        expect(await screen.findByText('Confirm Buy')).toBeInTheDocument();
        expect(
            await screen.findByText('No active offers for this token'),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Reject' }),
        ).toBeInTheDocument();

        // BUY is not refused and no sell form / orderbook buy slider is opened
        expect(screen.queryByText(/cannot be listed/)).not.toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(SLP_PRICE_PLACEHOLDER),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: '+ Buy' }),
        ).not.toBeInTheDocument();
    });

    it('BUY. An NFT collection cannot be bought, so it is refused.', async () => {
        renderToken(`/token/${slp1NftParentMocks.tokenId}?action=BUY`);

        await awaitTokenLoad(slp1NftParentMocks);

        // We tell the user this collection token cannot be bought (its child
        // NFTs are bought individually), and do not enter a buy state
        expect(await screen.findByText(/cannot be bought/)).toBeInTheDocument();
        expect(screen.queryByText(/cannot be listed/)).not.toBeInTheDocument();
    });

    it('BUY. An NFT oneshot stays on the token page; no sell form is opened.', async () => {
        renderToken(`/token/${slp1NftChildMocks.tokenId}?action=BUY`);

        await awaitTokenLoad(slp1NftChildMocks);

        // NFT BUY uses the oneshot UI on the token page (not DeepLinkBuy).
        // With no active offer mocked, the user is told it is not for sale —
        // the price comes from the chain, not from the link.
        expect(
            await screen.findByText('This NFT is not for sale'),
        ).toBeInTheDocument();
        expect(screen.queryByText('Confirm Buy')).not.toBeInTheDocument();

        // The sell form is not opened
        expect(
            screen.queryByPlaceholderText(NFT_PRICE_PLACEHOLDER),
        ).not.toBeInTheDocument();
    });

    it('BUY. A price param is invalid and surfaces an error.', async () => {
        renderToken(
            `/token/${slp1NftChildMocks.tokenId}?action=BUY&price=5000`,
        );

        await awaitTokenLoad(slp1NftChildMocks);

        // A BUY takes its price from the chain, so a price param is rejected
        expect(
            await screen.findByText(/buy link cannot specify a price/),
        ).toBeInTheDocument();
    });

    it('A query tokenId that conflicts with the path tokenId is refused.', async () => {
        // The path tokenId is the NFT child; a different tokenId in the query is
        // ambiguous, so the link is refused rather than acted on
        renderToken(
            `/token/${slp1NftChildMocks.tokenId}?action=BUY&tokenId=${slp1FixedMocks.tokenId}`,
        );

        await awaitTokenLoad(slp1NftChildMocks);

        expect(
            await screen.findByText(/conflicting token id/),
        ).toBeInTheDocument();
    });

    it('An unrecognized action is refused with an error; the default screen is shown.', async () => {
        renderToken(
            `/token/${slp1NftChildMocks.tokenId}?action=notARealAction&price=5000`,
        );

        await awaitTokenLoad(slp1NftChildMocks);

        expect(
            await screen.findByText(/Unsupported token action: NOTAREALACTION/),
        ).toBeInTheDocument();

        // Default action is Buy
        expect(
            await screen.findByRole('button', { name: '+ Buy' }),
        ).toBeInTheDocument();

        // The unknown action did not open the sell form or prefill a price
        expect(
            screen.queryByPlaceholderText(NFT_PRICE_PLACEHOLDER),
        ).not.toBeInTheDocument();
    });

    it('No params. The token screen loads normally with no action preselected.', async () => {
        renderToken(`/token/${slp1NftChildMocks.tokenId}`);

        await awaitTokenLoad(slp1NftChildMocks);

        expect(
            await screen.findByRole('button', { name: '+ Buy' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(NFT_PRICE_PLACEHOLDER),
        ).not.toBeInTheDocument();
    });
});
