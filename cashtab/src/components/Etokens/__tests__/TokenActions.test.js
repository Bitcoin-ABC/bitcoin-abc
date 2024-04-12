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
    tokenTestWallet,
    supportedTokens,
    slp1FixedMocks,
    slp1VarMocks,
    alpMocks,
    slp1NftParentMocks,
} from 'components/Etokens/fixtures/mocks';

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

describe('<TokenActions />', () => {
    let mockedChronik;
    beforeEach(async () => {
        // Mock the app with context at the Send screen
        mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Build chronik mocks that Cashtab would use to add token info to cache
        for (const tokenMock of supportedTokens) {
            mockedChronik.setMock('token', {
                input: tokenMock.tokenId,
                output: tokenMock.token,
            });
            mockedChronik.setMock('tx', {
                input: tokenMock.tokenId,
                output: tokenMock.tx,
            });
            mockedChronik.setTokenId(tokenMock.tokenId);
            mockedChronik.setUtxosByTokenId(tokenMock.tokenId, {
                tokenId: tokenMock.tokenId,
                utxos: tokenMock.utxos,
            });
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
    it('SLP1 fixed supply token', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${slp1FixedMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1FixedMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `SLP 1 fungible token. Token may be of fixed supply if no mint batons exist. If you have a mint baton, you can mint more of this token at any time. May have up to 9 decimal places.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered as fixed
        expect(
            screen.getByText('2,999,998,798.000000000 (fixed)'),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // The send switch is turned on by default
        expect(screen.getByTitle('Toggle Send')).toHaveProperty(
            'checked',
            true,
        );

        // The Airdrop switch is present
        expect(screen.getByTitle('Toggle Airdrop')).toBeInTheDocument();

        // The Burn switch is present
        expect(screen.getByTitle('Toggle Burn')).toBeInTheDocument();

        // The Mint switch is present but disabled
        expect(screen.getByTitle('Toggle Mint')).toHaveProperty(
            'disabled',
            true,
        );

        // We have expected mint disabled label
        expect(
            screen.getByText('Mint (disabled, no mint baton in wallet)'),
        ).toBeInTheDocument();
    });
    it('SLP1 variable supply token with mint baton', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${slp1VarMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1VarMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `SLP 1 fungible token. Token may be of fixed supply if no mint batons exist. If you have a mint baton, you can mint more of this token at any time. May have up to 9 decimal places.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered as fixed
        expect(
            screen.getByText('18,446,744,073.709551615 (var.)'),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // The send switch is turned on by default
        expect(screen.getByTitle('Toggle Send')).toHaveProperty(
            'checked',
            true,
        );

        // The Airdrop switch is present
        expect(screen.getByTitle('Toggle Airdrop')).toBeInTheDocument();

        // The Burn switch is present
        expect(screen.getByTitle('Toggle Burn')).toBeInTheDocument();

        // The Mint switch is present and not disabled
        expect(screen.getByTitle('Toggle Mint')).toHaveProperty(
            'disabled',
            false,
        );
    });
    it('SLP1 NFT Parent token', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${slp1NftParentMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1NftParentMocks.token.genesisInfo;

        // Wait for the component to finish loading
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        screen.debug(null, Infinity);
        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `The parent tokens for an NFT collection. Can be used to mint NFTs. No decimal places. The supply of this token is the potential quantity of NFTs which could be minted. If no mint batons exist, the supply is fixed.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered
        expect(screen.getByText('100 (var.)')).toBeInTheDocument();

        // No token actions are available
        expect(screen.queryByTitle('Token Actions')).not.toBeInTheDocument();
    });
    it('ALP token', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${alpMocks.tokenId}`}
            />,
        );

        const { tokenName } = alpMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(`This token is not yet supported by Cashtab.`),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered
        expect(screen.getByText('111,367.0000 (var.)')).toBeInTheDocument();

        // No token actions are available
        expect(screen.queryByTitle('Token Actions')).not.toBeInTheDocument();
    });
});
