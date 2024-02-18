import React from 'react';
import { walletWithXecAndTokens } from '../fixtures/mocks';
import { render, screen } from '@testing-library/react';
import userEvent, {
    PointerEventsCheckLevel,
} from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { explorer } from 'config/explorer';
import { initializeCashtabStateForTests } from 'components/fixtures/helpers';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import CashtabTestWrapper from 'components/fixtures/CashtabTestWrapper';

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

describe('<CreateTokenForm />', () => {
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
        await localforage.clear();
    });
    it('User can input valid token parameters, generate a token, and view a success notification', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
        );
        // Add tx mock to mockedChronik
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a4730440220720af1735077aab9824268b75c6ee3990f0a81a0d4778850bcad0e35c42963f402201a7b7466b942bed0f15056994d8d880ac78104cf10aadf8e9e5d4850969917684121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000466a04534c500001010747454e4553495303544b450a7465737420746f6b656e1768747470733a2f2f7777772e636173687461622e636f6d4c0001024c0008000000000393870022020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac27800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'bc9eacaaa64d4706fe6653608245848ae76ffdd31882b75de0d6518c57e9699f';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route="/create-token"
            />,
        );

        // Configure userEvent to skip PointerEventsCheck, as this returns false positives with antd
        const user = userEvent.setup({
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });

        // The user enters valid token metadata
        await user.type(
            await screen.findByPlaceholderText('Enter a name for your token'),
            'test token',
        );
        await user.type(
            await screen.findByPlaceholderText('Enter a ticker for your token'),
            'TKE',
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Enter number of decimal places',
            ),
            '2',
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Enter the fixed supply of your token',
            ),
            '600000',
        );
        await user.type(
            await screen.findByPlaceholderText(
                'Enter a website for your token',
            ),
            'https://www.cashtab.com',
        );

        // Click the Create eToken button
        await user.click(screen.getByRole('button', { name: /Create eToken/ }));

        // Click OK on confirmation modal
        await user.click(screen.getByText('OK'));

        // Verify notification triggered
        expect(
            await screen.findByText(
                'Token created! Click to view in block explorer.',
            ),
        ).toHaveAttribute('href', `${explorer.blockExplorerUrl}/tx/${txid}`);
    });
});
