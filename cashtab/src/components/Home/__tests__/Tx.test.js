// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Tx from 'components/Home/Tx';
import { mockReceivedTxData } from 'components/Home/fixtures/mocks';
import CashtabState from 'config/CashtabState';

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
                    cashtabState={new CashtabState()}
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
        render(
            <ThemeProvider theme={theme}>
                <Tx
                    data={{ ...mockReceivedTxData, timeFirstSeen: 0 }}
                    fiatPrice={0.00003}
                    fiatCurrency="usd"
                    cashtabState={new CashtabState()}
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
                    cashtabState={new CashtabState()}
                />
            </ThemeProvider>,
        );

        // leftTxtCtn is rendered
        const leftTxtCtn = screen.queryByTestId('left-txt-ctn');
        expect(leftTxtCtn).toBeInTheDocument();

        // No timestamp is rendered as we have no timestamp to go off of in this case
        expect(leftTxtCtn).toHaveTextContent('Received');
    });
    it('Renders from contact name if a tx is from an address in contact list', async () => {
        render(
            <ThemeProvider theme={theme}>
                <Tx
                    data={mockReceivedTxData}
                    fiatPrice={0.00003}
                    fiatCurrency="usd"
                    cashtabState={{
                        ...new CashtabState(),
                        contactList: [
                            {
                                name: 'inTheList',
                                address:
                                    'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6',
                            },
                        ],
                    }}
                />
                ,
            </ThemeProvider>,
        );

        expect(screen.getByText('from inTheList')).toBeInTheDocument();
    });
    it('Does not render from contact name if a tx is not from an address in contact list', async () => {
        render(
            <ThemeProvider theme={theme}>
                <Tx
                    data={mockReceivedTxData}
                    fiatPrice={0.00003}
                    fiatCurrency="usd"
                    cashtabState={new CashtabState()}
                />
                ,
            </ThemeProvider>,
        );

        expect(screen.queryByText('from inTheList')).not.toBeInTheDocument();
    });
});
