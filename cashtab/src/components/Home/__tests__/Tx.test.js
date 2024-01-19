import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tx from 'components/Home/Tx';
import { cashtabSettings } from 'config/cashtabSettings';
import { mockReceivedTxData } from 'components/Home/fixtures/mocks';
import cashtabCache from 'config/cashtabCache';

function mockFunction() {
    const original = jest.requireActual('react-router-dom');
    return {
        ...original,
        useLocation: jest.fn().mockReturnValue({
            pathname: '/another-route',
            search: '',
            hash: '',
            state: null,
            key: '5nvxpbdafa',
        }),
    };
}

jest.mock('react-router-dom', () => mockFunction());

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

describe('<Tx />', () => {
    it('Renders the timestamp if timeFirstSeen !== 0', async () => {
        render(
            <ThemeProvider theme={theme}>
                <Tx
                    data={mockReceivedTxData}
                    fiatPrice={0.00003}
                    fiatCurrency="usd"
                    addressesInContactList={[]}
                    contactList={[{}]}
                    cashtabSettings={cashtabSettings}
                    cashtabCache={cashtabCache}
                />
                ,
            </ThemeProvider>,
        );

        // leftTxtCtn is rendered
        const leftTxtCtn = screen.queryByTestId('left-txt-ctn');
        expect(leftTxtCtn).toBeInTheDocument();

        // Expected timestamp is displayed
        expect(leftTxtCtn).toHaveTextContent(
            'ReceivedJan 14, 2024 at 4:40:11 AM',
        );
    });
    it('Renders the timestamp as block timestamp timeFirstSeen === 0', async () => {
        const noTimeFirstSeenMock = JSON.parse(
            JSON.stringify(mockReceivedTxData),
        );
        noTimeFirstSeenMock.timeFirstSeen = '0';
        render(
            <ThemeProvider theme={theme}>
                <Tx
                    data={noTimeFirstSeenMock}
                    fiatPrice={0.00003}
                    fiatCurrency="usd"
                    addressesInContactList={[]}
                    contactList={[{}]}
                    cashtabSettings={cashtabSettings}
                    cashtabCache={cashtabCache}
                />
            </ThemeProvider>,
        );

        // leftTxtCtn is rendered
        const leftTxtCtn = screen.queryByTestId('left-txt-ctn');
        expect(leftTxtCtn).toBeInTheDocument();

        // Expected timestamp is displayed
        expect(leftTxtCtn).toHaveTextContent(
            'ReceivedJan 14, 2024 at 4:46:35 AM',
        );
    });
    it(`Does not render a timestamp for an unconfirmed tx with timeFirstSeen === '0'`, async () => {
        const noTimeFirstSeenUnconfirmedMock = JSON.parse(
            JSON.stringify(mockReceivedTxData),
        );
        noTimeFirstSeenUnconfirmedMock.timeFirstSeen = '0';
        delete noTimeFirstSeenUnconfirmedMock['block'];
        render(
            <ThemeProvider theme={theme}>
                <Tx
                    data={noTimeFirstSeenUnconfirmedMock}
                    fiatPrice={0.00003}
                    fiatCurrency="usd"
                    addressesInContactList={[]}
                    contactList={[{}]}
                    cashtabSettings={cashtabSettings}
                    cashtabCache={cashtabCache}
                />
            </ThemeProvider>,
        );

        // leftTxtCtn is rendered
        const leftTxtCtn = screen.queryByTestId('left-txt-ctn');
        expect(leftTxtCtn).toBeInTheDocument();

        // No timestamp is rendered as we have no timestamp to go off of in this case
        expect(leftTxtCtn).toHaveTextContent('Received');
    });
});
