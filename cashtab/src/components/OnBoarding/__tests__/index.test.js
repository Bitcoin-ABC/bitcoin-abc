// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { when } from 'jest-when';
import appConfig from 'config/app';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import { Ecc } from 'ecash-lib';

describe('<OnBoarding />', () => {
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

    it('We can create a new wallet', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );

        mockedChronik.setTxHistoryByAddress(
            'ecash:qrj4phtd5fyz024uvstcmuf06urmhhgjvv5d0ammua',
            [],
        );

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We can add a wallet without specifying any mnemonic
        await userEvent.click(
            screen.getByRole('button', {
                name: /New Wallet/,
            }),
        );

        // We see the backup wallet alert
        expect(
            await screen.findByText('Backup your wallet'),
        ).toBeInTheDocument();

        // We see a QR code
        expect(screen.getByTitle('Raw QR Code')).toBeInTheDocument();

        // New wallet is added in localforage
        const walletsAfterAdd = await localforage.getItem('wallets');
        expect(walletsAfterAdd[walletsAfterAdd.length - 1].name).toBe(
            'qrj...mua',
        );
    });
    it('We can import a wallet', async () => {
        // localforage defaults
        const mockedChronik = await initializeCashtabStateForTests(
            false,
            localforage,
        );

        // Set empty tx history for the wallet
        mockedChronik.setTxHistoryByAddress(
            'ecash:qzxep3zqcpnuwzx5krsv9hgczv274v4yd50sl0hl7c',
            [],
        );

        render(<CashtabTestWrapper ecc={ecc} chronik={mockedChronik} />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We can import a wallet by specifying a mnemonic
        await userEvent.click(
            screen.getByRole('button', {
                name: /Import Wallet/,
            }),
        );

        // We see import modal
        expect(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
        ).toBeInTheDocument();

        // Import button is disabled
        const importBtn = screen.getByRole('button', {
            name: 'OK',
        });
        expect(importBtn).toHaveProperty('disabled', true);

        // Type in most of a mnemonic
        await userEvent.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            'pioneer waste next tired armed course expand stairs load brick asthma ',
        );

        // The validation msg is in the document
        expect(
            screen.getByText(
                'Invalid 12-word mnemonic. Note: all letters must be lowercase.',
            ),
        ).toBeInTheDocument();

        // Type in the rest
        await userEvent.type(
            screen.getByPlaceholderText('mnemonic (seed phrase)'),
            'budget',
        );

        // The validation msg is not in the document
        expect(
            screen.queryByText(
                'Invalid 12-word mnemonic. Note: all letters must be lowercase.',
            ),
        ).not.toBeInTheDocument();

        // The button is not disabled
        expect(importBtn).toHaveProperty('disabled', false);

        // Click import
        await userEvent.click(importBtn);

        // The wallet is in localforage
        const walletsAfterImport = await localforage.getItem('wallets');
        expect(walletsAfterImport[walletsAfterImport.length - 1].name).toBe(
            'qzx...l7c',
        );

        // The modal will be closed after a successful import
        await waitFor(() =>
            expect(
                screen.queryByPlaceholderText('mnemonic (seed phrase)'),
            ).not.toBeInTheDocument(),
        );

        // We see the backup wallet alert
        expect(
            await screen.findByText('Backup your wallet'),
        ).toBeInTheDocument();

        // We see a QR code
        expect(screen.getByTitle('Raw QR Code')).toBeInTheDocument();
    });
});
