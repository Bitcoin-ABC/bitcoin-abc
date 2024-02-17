import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { walletWithXecAndTokens } from 'components/fixtures/mocks';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import { initializeCashtabStateForTests } from 'components/fixtures/helpers';
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

describe('<App />', () => {
    beforeEach(() => {
        // Mock the fetch call Cashtab's price API
        global.fetch = jest.fn();
        const fiatCode = 'usd'; // Use usd until you mock getting settings from localforage
        const cryptoId = appConfig.coingeckoId;
        // Keep this in the code, because different URLs will have different outputs require different parsing
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
    it('Renders 404 on a bad route', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(false);
        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/not-a-route" />,
        );

        // We get the 404
        expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
    it('Navigation menu routes to expected components', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);
        const user = userEvent.setup();

        // Default route is home
        await screen.findByTestId('home-ctn');

        // Navigate to Send screen
        await user.click(screen.queryByTestId('nav-btn-send'));

        // Now we see the Send screen
        expect(screen.getByTestId('send-xec-ctn')).toBeInTheDocument();

        // Navigate to eTokens screen
        await user.click(screen.queryByTestId('nav-btn-etokens'));

        // Now we see the eTokens screen
        expect(screen.getByTestId('etokens-ctn')).toBeInTheDocument();

        // Navigate to Receive screen
        await user.click(screen.queryByTestId('nav-btn-receive'));

        // Now we see the Receive screen
        expect(screen.getByTestId('receive-ctn')).toBeInTheDocument();

        // We do not expect to see hamburger menu items before the menu is clicked
        // This is handled by dynamic css changes, so test that
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 0`,
        );

        // Click the hamburger menu
        await user.click(screen.queryByTestId('hamburger'));

        // Now we see these items
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 100rem`,
        );

        // Navigate to Airdrop screen
        await user.click(screen.queryByTestId('nav-btn-airdrop'));

        // Now we see the Airdrop screen
        expect(screen.getByTestId('airdrop-ctn')).toBeInTheDocument();

        // The hamburger menu closes on nav
        expect(screen.queryByTestId('hamburger-menu')).toHaveStyle(
            `max-height: 0`,
        );

        // ... but, we can still click these items with the testing library, so we do
        // Navigate to Swap screen
        await user.click(screen.queryByTestId('nav-btn-swap'));

        // Now we see the Swap screen
        expect(screen.getByTestId('swap-ctn')).toBeInTheDocument();

        // Navigate to SignVerifyMsg screen
        await user.click(screen.queryByTestId('nav-btn-signverifymsg'));

        // Now we see the SignVerifyMsg screen
        expect(screen.getByTestId('signverifymsg-ctn')).toBeInTheDocument();

        // Navigate to Settings screen
        await user.click(screen.queryByTestId('nav-btn-configure'));

        // Now we see the Settings screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();
    });
    it('Renders the App screen showing normal wallet info for a created wallet', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Input fields are rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();
    });
    it('Renders the onboarding screen if the user has no wallet', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(false);
        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Input fields are rendered
        expect(screen.queryByTestId('wallet-info-ctn')).not.toBeInTheDocument();
    });
});
