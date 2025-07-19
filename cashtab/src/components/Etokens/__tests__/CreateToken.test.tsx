// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import {
    walletWithXecAndTokens,
    bearTokenAndTx,
} from 'components/App/fixtures/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { prepareContext, mockPrice } from 'test';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from 'wallet/context';
import { ChronikClient } from 'chronik-client';
import { Ecc } from 'ecash-lib';
import { Agora } from 'ecash-agora';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../../modules/mock-chronik-client';
import App from 'components/App/App';

interface CreateTokenTestWrapperProps {
    chronik: MockChronikClient;
    agora: MockAgora;
    ecc: Ecc;
    theme: any;
    route?: string;
}

const CreateTokenTestWrapper: React.FC<CreateTokenTestWrapperProps> = ({
    chronik,
    agora,
    ecc,
    theme,
    route = '/create-token',
}) => (
    <WalletProvider
        chronik={chronik as unknown as ChronikClient}
        agora={agora as unknown as Agora}
        ecc={ecc}
    >
        <MemoryRouter initialEntries={[route]}>
            <ThemeProvider theme={theme}>
                <App />
            </ThemeProvider>
        </MemoryRouter>
    </WalletProvider>
);

describe('<CreateToken />', () => {
    const ecc = new Ecc();
    let mockAgora: MockAgora;

    beforeEach(() => {
        mockAgora = new MockAgora();
        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        mockPrice(0.00003);
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await localforage.clear();
    });

    it('If wallet has sufficient XEC, renders CreateTokenForm', async () => {
        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });
        const mockedChronik = await prepareContext(
            localforage,
            [walletWithXecAndTokens],
            tokenMocks,
        );

        render(
            <CreateTokenTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Renders CreateTokenForm, as this wallet has sufficient balance to create a token
        expect(await screen.findByText('Create Token')).toBeInTheDocument();

        // Does not render insufficient balance alert
        expect(
            screen.queryByText(
                'You need at least 5.46 spendable XEC ($0.0002 USD) to create a token',
            ),
        ).not.toBeInTheDocument();
    });

    it('If wallet has insufficient XEC, renders component but does not render CreateTokenForm', async () => {
        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });
        const walletWithInsufficientBalance = {
            ...walletWithXecAndTokens,
            state: {
                ...walletWithXecAndTokens.state,
                balanceSats: 0,
                nonSlpUtxos: [],
            },
        };

        const mockedChronik = await prepareContext(
            localforage,
            [walletWithInsufficientBalance],
            tokenMocks,
        );

        render(
            <CreateTokenTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                theme={theme}
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for the wallet balance to load
        expect(
            await screen.findByTitle('Balance XEC', {}, { timeout: 10000 }),
        ).toHaveTextContent('0.00 XEC');

        // We do not see the Create a Token form
        expect(screen.queryByText('Create Token')).not.toBeInTheDocument();

        // Renders expected alert
        // Note: the component is expected to load before fiatPrice loads
        // In this case, we do not display the fiat price
        expect(
            await screen.findByText(
                'You need at least 5.46 spendable XEC ($0.0002 USD) to create a token',
            ),
        ).toBeInTheDocument();
    });
});
