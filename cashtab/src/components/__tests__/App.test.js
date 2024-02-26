import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent, {
    PointerEventsCheckLevel,
} from '@testing-library/user-event';
import '@testing-library/jest-dom';
import {
    walletWithXecAndTokens,
    freshWalletWithOneIncomingCashtabMsg,
} from 'components/fixtures/mocks';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import {
    clearLocalForage,
    initializeCashtabStateForTests,
} from 'components/fixtures/helpers';
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
    it('Renders 404 on a bad route', async () => {
        // This is the experience of a user visiting cashtab.com for the first time
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );
        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/not-a-route" />,
        );

        // We get the 404
        expect(screen.getByTestId('not-found')).toBeInTheDocument();
    });
    it('Navigation menu routes to expected components', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
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
    it('Adding a contact to to a new contactList by clicking on tx history adds it to localforage and wallet context', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the page to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // We see the home container
        await screen.findByTestId('home-ctn');

        // Open the collapse of this tx in tx history
        await userEvent.click(
            await screen.findByRole('button', {
                name: /Warning: This sender is not in your contact list. Beware of scams./,
            }),
            {
                // https://github.com/testing-library/user-event/issues/922
                pointerEventsCheck: PointerEventsCheckLevel.Never,
            },
        );

        // Get the "Add to contacts" button of tx
        const addToContactsBtn = screen.getByTestId('add-to-contacts-btn');

        // We do not see the configure screen before clicking the button
        expect(screen.queryByTestId('configure-ctn')).not.toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toStrictEqual(null);

        // Click the button
        await userEvent.click(addToContactsBtn);

        // Now we see the Configure screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        const newContactList = [
            {
                address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                name: 'qphlh',
            },
        ];

        const storedContactListNow = await localforage.getItem('contactList');

        // localforage has been updated with this newly added contact
        expect(storedContactListNow).toEqual(newContactList);
    });
    it('Adding a contact to an existing contactList by clicking on tx history adds it to localforage and wallet context', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );
        // Populate the contactList
        const initialContactList = [
            {
                address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                name: 'echo',
            },
        ];
        await localforage.setItem('contactList', initialContactList);

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for the page to load
        await waitFor(() =>
            expect(screen.queryByTestId('loading-ctn')).not.toBeInTheDocument(),
        );

        // We see the home container
        await screen.findByTestId('home-ctn');

        // Open the collapse of this tx in tx history
        await userEvent.click(
            await screen.findByRole('button', {
                name: /Warning: This sender is not in your contact list. Beware of scams./,
            }),
            {
                // https://github.com/testing-library/user-event/issues/922
                pointerEventsCheck: PointerEventsCheckLevel.Never,
            },
        );

        // Get the "Add to contacts" button of tx
        const addToContactsBtn = screen.getByTestId('add-to-contacts-btn');

        // We do not see the configure screen before clicking the button
        expect(screen.queryByTestId('configure-ctn')).not.toBeInTheDocument();

        // Confirm expected initial state of localforage
        const storedContacts = await localforage.getItem('contactList');
        expect(storedContacts).toEqual(initialContactList);

        // Click the button
        await userEvent.click(addToContactsBtn);

        // Now we see the Configure screen
        expect(screen.getByTestId('configure-ctn')).toBeInTheDocument();

        // localforage has been updated with this newly added contact
        await waitFor(async () =>
            expect(await localforage.getItem('contactList')).toEqual([
                {
                    address: 'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj',
                    name: 'echo',
                },
                {
                    address: 'ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y',
                    name: 'qphlh',
                },
            ]),
        );
    });
    it('A user with legacy blank contactList in localstorage is migrated on startup', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );
        const LEGACY_EMPTY_CONTACT_LIST = [{}];
        await localforage.setItem('contactList', LEGACY_EMPTY_CONTACT_LIST);

        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wait for cashtabbootup, so that loadContactList has been called
        // Wallet-info is rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();

        // localforage has been updated with the new format for an empty contact list
        await waitFor(async () =>
            expect(await localforage.getItem('contactList')).toStrictEqual([]),
        );
    });
    it('Clicking "reply" on a Cashtab Msg correctly populates the SendXec to address and amount fields', async () => {
        // Get mocked chronik client with expected API results for this wallet
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );

        // Render app on home screen
        render(<CashtabTestWrapper chronik={mockedChronik} />);

        // Wallet-info is rendered
        expect(
            await screen.findByTestId('wallet-info-ctn'),
        ).toBeInTheDocument();

        // Balance is correct
        expect(await screen.findByTestId('balance-xec')).toHaveTextContent(
            '10,000.00 XEC',
        );

        // We do not see the send screen before clicking the button
        await waitFor(() =>
            expect(
                screen.queryByTestId('send-xec-ctn'),
            ).not.toBeInTheDocument(),
        );

        await waitFor(async () => {
            // Get the "Reply to" button of Cashtab Msg
            const cashtabMsgReplyBtn = screen.getByTestId('cashtab-msg-reply');
            // Click reply to cashtab msg button
            // ref https://github.com/testing-library/user-event/issues/922
            // ref https://github.com/testing-library/user-event/issues/662
            // issue with using userEvents.click() here likely related to antd
            cashtabMsgReplyBtn.click();
        });

        // Now we see the Send screen
        expect(await screen.findByTestId('send-xec-ctn')).toBeInTheDocument();

        // The SendXec send address input is rendered and has expected value
        expect(
            await screen.findByTestId('destination-address-single'),
        ).toHaveValue('ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y');
        // The value field is populated with dust
        expect(await screen.findByTestId('send-xec-input')).toHaveValue(5.5);
    });
    it('We do not see the camera auto-open setting in the config screen on a desktop device', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );

        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/configure" />,
        );

        // We are on the settings screen
        await screen.findByTestId('configure-ctn');

        // We do not see the auto open option
        expect(screen.queryByText('Auto-open camera')).not.toBeInTheDocument();
    });
    it('We do see the camera auto-open setting in the config screen on a mobile device', async () => {
        Object.defineProperty(navigator, 'userAgentData', {
            value: {
                mobile: true,
            },
            writable: true,
        });

        // Get mocked chronik client with expected API results for this wallet
        const mockedChronik = await initializeCashtabStateForTests(
            freshWalletWithOneIncomingCashtabMsg,
            localforage,
        );

        render(
            <CashtabTestWrapper chronik={mockedChronik} route="/configure" />,
        );

        // We are on the settings screen
        await screen.findByTestId('configure-ctn');

        // Now we do see the auto open option
        expect(await screen.findByText('Auto-open camera')).toBeInTheDocument();

        // Unset mock
        Object.defineProperty(navigator, 'userAgentData', {
            value: {
                mobile: false,
            },
            writable: true,
        });
    });
});
