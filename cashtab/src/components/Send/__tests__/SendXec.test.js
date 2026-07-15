// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import {
    walletWithXecAndTokensActive,
    populatedContactList,
    validSavedWallets,
} from 'components/App/fixtures/mocks';
import {
    SEND_ADDRESS_VALIDATION_ERRORS,
    SEND_AMOUNT_VALIDATION_ERRORS,
} from 'components/Send/fixtures/mocks';
import { when } from 'jest-when';
import { explorer } from 'config/explorer';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import appConfig from 'config/app';
import { FEE_SATS_PER_KB_CASHTAB_LEGACY } from 'constants/transactions';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import { Ecc } from 'ecash-lib';
import {
    slp1FixedBear,
    slp1FixedCachet,
    alpMocks,
    slp1NftChildMocks,
    slp1NftParentMocks,
    slpMintVaultMocks,
    tokenTestWallet,
} from 'components/Etokens/fixtures/mocks';
import { FIRMA, FIRMA_REDEEM_ADDRESS } from 'constants/tokens';
import { previewAddress } from 'helpers';
import {
    BLITZ_CHIPS_GAME_ADDRESS,
    EVERY_DAY_JACKPOT_GAME_ADDRESS,
} from 'constants/recipients';

describe('<SendXec />', () => {
    const ecc = new Ecc();

    const getRecipientInput = async () =>
        screen.findByPlaceholderText('Address or contact');

    const expectResolvedRecipient = async expectedLabel => {
        // Blur so the send field collapses to the resolved label
        await user.tab();
        expect(
            await screen.findByRole('status', {
                name: `Recipient ${expectedLabel}`,
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Clear recipient' }),
        ).toBeInTheDocument();
    };

    let user;
    beforeEach(() => {
        // Set up userEvent
        user = userEvent.setup();
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
    it('Renders the SendXec screen with send address input', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // Inputs are not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);
        expect(amountInputEl).toHaveProperty('disabled', false);

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // We select op_return_raw input (expand Advanced first, then click op_return_raw)
        await user.click(screen.getByRole('button', { name: /Advanced/i }));
        await user.click(screen.getByRole('button', { name: 'op_return_raw' }));

        // We do not see the parsed op return raw msg area bc the op_return_raw input is empty
        expect(
            screen.queryByTestId('Parsed op_return_raw'),
        ).not.toBeInTheDocument();
    });
    it('Pass valid address to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid address
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';

        await user.type(addressInputEl, addressInput);

        // Valid address resolves to a preview (or contact / known name)
        await expectResolvedRecipient(
            previewAddress(addressInput.split('?')[0]),
        );

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is disabled because amount is null
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );
    });
    it('Searching contacts shows matches; selecting one resolves the name and send works', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        await localforage.setItem('contactList', populatedContactList);
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY,
        });

        // Same hex as fiat-denominated send to alpha contact address for 7000 sats
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064413b207f573a7abb9ec0d149fa71cbde63272a0e6b58298a81bc39ac2001729205bd1e9284c9d5a268f7abe63c5c953bf932ac06c13e408341bde4e4807d7f2fe94121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0260ae0a00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acf7d30300000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'a6e905185097cc1ffb289ca366ff7322f8aaf95713d1e5d1a4e89663e609530f';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        await user.type(addressInputEl, 'alp');

        expect(
            await screen.findByRole('button', { name: 'alpha' }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'alpha' }));
        await expectResolvedRecipient('alpha');

        const amountInputEl = screen.getByPlaceholderText('Amount');
        await user.selectOptions(
            screen.getByTestId('currency-select-dropdown'),
            screen.getByTestId('fiat-option'),
        );
        await user.type(amountInputEl, '0.21');

        await user.click(screen.getByRole('button', { name: 'Send' }));
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('Searching own wallets shows wallet matches with My wallet icon', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        const storedWallets = await localforage.getItem('wallets');
        storedWallets.push(validSavedWallets[1]); // bravo
        await localforage.setItem('wallets', storedWallets);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        await user.type(addressInputEl, 'brav');

        expect(
            await screen.findByRole('button', { name: 'bravo' }),
        ).toBeInTheDocument();
        expect(screen.getByTitle('My wallet')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'bravo' }));
        await expectResolvedRecipient('bravo');
        expect(screen.getByTitle('My wallet')).toBeInTheDocument();
    });
    it('Pasting a known destination address resolves to its display name', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        await user.type(addressInputEl, BLITZ_CHIPS_GAME_ADDRESS);
        await expectResolvedRecipient('BlitzChips');

        await user.click(
            screen.getByRole('button', { name: 'Clear recipient' }),
        );
        const clearedInput = await getRecipientInput();
        await user.type(clearedInput, EVERY_DAY_JACKPOT_GAME_ADDRESS);
        await expectResolvedRecipient('EveryDayJackpot');
    });
    it('Pass an invalid address to Send To field and get a validation error', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters an invalid address
        const addressInput = 'ecash:notValid';
        await user.type(addressInputEl, addressInput);

        // Invalid address stays in the input with a validation error
        expect(addressInputEl).toHaveValue(addressInput);

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is NOT disabled because there is no BIP21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // We get expected addr validation error
        expect(screen.getByText('Invalid address')).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );
    });
    it('Pass a valid address and bip21 query string with valid amount param to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=500';
        await user.type(addressInputEl, addressInput);

        // Valid address resolves to a preview (or contact / known name)
        await expectResolvedRecipient(
            previewAddress(addressInput.split('?')[0]),
        );

        // Advanced controls are hidden for BIP21 input
        expect(
            screen.queryByRole('button', { name: /Advanced/i }),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is enabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );
    });
    it('Pass a valid address and bip21 query string with invalid amount param (dust) to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const dustAmount = 5;
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=${dustAmount}`;
        await user.type(addressInputEl, addressInput);

        // Valid address resolves to a preview (or contact / known name)
        await expectResolvedRecipient(
            previewAddress(addressInput.split('?')[0]),
        );

        // Amount input is the invalid amount param value
        expect(amountInputEl).toHaveValue(dustAmount);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // We get expected addr validation error
        expect(
            screen.getByText(`Send amount must be at least 5.46 XEC`),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // Advanced controls are hidden for BIP21 input
        expect(
            screen.queryByRole('button', { name: /Advanced/i }),
        ).not.toBeInTheDocument();
    });
    it('Valid address with valid bip21 query string with valid amount param rejected if amount exceeds wallet balance', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const exceedBalanceAmount = 1000000; // 1 million X E C
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=${exceedBalanceAmount}`;
        await user.type(addressInputEl, addressInput);

        // Valid address resolves to a preview (or contact / known name)
        await expectResolvedRecipient(
            previewAddress(addressInput.split('?')[0]),
        );

        // Amount input is the invalid amount param value
        expect(amountInputEl).toHaveValue(exceedBalanceAmount);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // We get expected addr validation error
        expect(
            screen.getByText(
                `Amount 1,000,000.00 XEC exceeds wallet balance of 9,513.12 XEC`,
            ),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // Advanced controls are hidden for BIP21 input
        expect(
            screen.queryByRole('button', { name: /Advanced/i }),
        ).not.toBeInTheDocument();
    });
    it('Pass a valid address and an invalid bip21 query string', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a badly formed query string
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?notaparam=500';
        await user.type(addressInputEl, addressInput);

        // Invalid BIP21 stays in the input with a validation error
        expect(addressInputEl).toHaveValue(addressInput);

        // Advanced controls are hidden for BIP21 input
        expect(
            screen.queryByRole('button', { name: /Advanced/i }),
        ).not.toBeInTheDocument();

        // Amount input unchanged
        expect(amountInputEl).toHaveValue(null);

        // The amount input is not disabled because no amount param is specified
        expect(amountInputEl).toHaveProperty('disabled', false);

        // We get expected addr validation error
        expect(
            screen.getByText(`Unsupported param "notaparam"`),
        ).toBeInTheDocument();

        // The Send button is disabled
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // Message control is hidden as part of hidden Advanced section
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
    });
    it('Pass a valid address and bip21 query string with op_return_raw param to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const op_return_raw = '0401020304';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?op_return_raw=${op_return_raw}`;
        await user.type(addressInputEl, addressInput);

        // Valid address resolves to a preview (or contact / known name)
        await expectResolvedRecipient(
            previewAddress(addressInput.split('?')[0]),
        );

        // Advanced controls are hidden for BIP21 input
        expect(
            screen.queryByRole('button', { name: /Advanced/i }),
        ).not.toBeInTheDocument();

        // Amount input is untouched
        expect(amountInputEl).toHaveValue(null);

        // The amount input is not disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', false);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // BIP21 op_return_raw is rendered as parsed output, not editable input
        expect(screen.getByText('Parsed op_return_raw')).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(
                `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
            ),
        ).not.toBeInTheDocument();

        // The Send button is disabled because amount is not entered
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // Message control is hidden as part of hidden Advanced section
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
    });
    it('Parses input_data_raw correctly (lokad + bet range) for XEC send', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // DICE bet format: lokad (DICE) + version + minValue + maxValue
        // 44494345000100000000e1f505 = range [1, 100000000]
        const inputDataRaw = '44494345000100000000e1f505';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=100&input_data_raw=${inputDataRaw}`;
        await user.type(addressInputEl, addressInput);

        await expectResolvedRecipient(
            previewAddress(addressInput.split('?')[0]),
        );
        expect(amountInputEl).toHaveValue(100);

        // input_data_raw is parsed from BIP21 only; parsed section shows DICE Bet protocol and bet range
        expect(screen.getByText('Parsed input_data_raw')).toBeInTheDocument();
        expect(screen.getByText('DICE Bet')).toBeInTheDocument();
        expect(screen.getByText('Range: [1, 100000000]')).toBeInTheDocument();
    });
    it('Pass a valid address and bip21 query string with valid amount and op_return_raw params to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param
        const op_return_raw = '0401020304';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=500&op_return_raw=${op_return_raw}`;
        await user.type(addressInputEl, addressInput);

        // Valid address resolves to a preview (or contact / known name)
        await expectResolvedRecipient(
            previewAddress(addressInput.split('?')[0]),
        );

        // Advanced controls are hidden for BIP21 input
        expect(
            screen.queryByRole('button', { name: /Advanced/i }),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // BIP21 op_return_raw is rendered as parsed output, not editable input
        expect(screen.getByText('Parsed op_return_raw')).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(
                `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
            ),
        ).not.toBeInTheDocument();

        // The Send button is enabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );

        // Message control is hidden as part of hidden Advanced section
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
    });
    it('Pass a valid address and bip21 query string with valid amount and invalid op_return_raw params to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // The user enters a valid BIP21 query string with a valid amount param and invalid op_return_raw
        const op_return_raw = 'notahexstring';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=500&op_return_raw=${op_return_raw}`;
        await user.type(addressInputEl, addressInput);

        // Invalid BIP21 stays editable so the user can see the bad params
        expect(addressInputEl).toHaveValue(addressInput);

        // Advanced controls are hidden for BIP21 input
        expect(
            screen.queryByRole('button', { name: /Advanced/i }),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(500);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // Invalid BIP21 op_return_raw does not expose advanced input
        expect(
            screen.queryByPlaceholderText(
                `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
            ),
        ).not.toBeInTheDocument();

        // Invalid op_return_raw does not render parsed op_return section
        expect(
            screen.queryByText('Parsed op_return_raw'),
        ).not.toBeInTheDocument();

        // The Send button is disabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).toHaveStyle(
            'cursor: not-allowed',
        );

        // Message control is hidden as part of hidden Advanced section
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
    });
    it('Clicking "Send" will send a valid tx with op_return_raw after entry of a valid address and bip21 query string with valid amount and op_return_raw params to Send To field', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064410fed2b69cf2c9f0ca92318461d707292347ef567d6866d3889b510d1d1ab8615451dd1d56608457d4f40e8eb97f61dad4f3dc9fbef57099105a6a3e32e0efe8e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000296a04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177a4060000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac4f7b0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '63e4bba044135367eb71c71bc78aee91ecce0551fbdfbdb975e668fb808547ed';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');
        // The user enters a valid BIP21 query string with a valid amount param
        const op_return_raw =
            '04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=17&op_return_raw=${op_return_raw}`;
        await user.type(addressInputEl, addressInput);

        // Valid BIP21 resolves; clear remains available for manually entered strings
        await expectResolvedRecipient(
            previewAddress(addressInput.split('?')[0]),
        );
        expect(
            screen.getByRole('button', { name: 'Clear recipient' }),
        ).toBeInTheDocument();

        // Advanced controls are hidden for BIP21 input
        expect(
            screen.queryByRole('button', { name: /Advanced/i }),
        ).not.toBeInTheDocument();

        // Amount input is the valid amount param value
        expect(amountInputEl).toHaveValue(17);

        // The amount input is disabled because it is set by a bip21 query string
        expect(amountInputEl).toHaveProperty('disabled', true);

        // BIP21 op_return_raw is rendered as parsed output, not editable input
        expect(screen.getByText('Parsed op_return_raw')).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(
                `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
            ),
        ).not.toBeInTheDocument();

        // We see expected data in the op_return_raw preview
        expect(
            screen.getAllByText('cashtab message with op_return_raw')[0],
        ).toBeInTheDocument();

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is enabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        await waitFor(() =>
            // The op_return_raw set alert is now removed
            expect(
                screen.queryByText(
                    `Hex OP_RETURN "04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177" set by BIP21`,
                ),
            ).not.toBeInTheDocument(),
        );
        await waitFor(() =>
            // The amount input is no longer disabled
            expect(amountInputEl).toHaveProperty('disabled', false),
        );
        await waitFor(() =>
            // Amount input is reset
            expect(amountInputEl).toHaveValue(null),
        );

        // The 'Send To' input field has been cleared
        expect(await getRecipientInput()).toHaveValue('');
    });
    it('We can calculate max send amount with and without a cashtab msg, and send a max sat tx with a cashtab msg', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064418305d1f7771a13e90b0cb15adf1c0a39b4381d1ec1bc3bebfa67cbbb5c9461b1a9d0c5a66ca5935aad771cbe869c9002add8b9d9822724ce73db8d15554f26cb4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0200000000000000003c6a040074616235486f772061626f75742061206c6f6e672d6973682043617368746162206d7367207769746820656d6f6a697320f09f8eaff09f988e11820e00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac00000000';
        const txid =
            'b1d49881be9c810e4408881438efb9e910d9e03bcc12a7bfcd652a0952d06f42';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');
        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, addressInput);

        // We click "max" to populate the Amount field
        await user.click(screen.getByText('max'));

        // Amount input is the expected max send for Cashtab's fee and no other outputs
        expect(amountInputEl).toHaveValue(9509.4);

        // Let's add a Cashtab message (expand Advanced first, then click Message)
        await user.click(screen.getByRole('button', { name: /Advanced/i }));
        await user.click(screen.getByRole('button', { name: 'Message' }));

        // Confirm that even a msg of blank spaces is added
        await user.type(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
            `     `,
        );

        // We click "max" again to recalculate the max send amount
        await user.click(screen.getByText('max'));

        // Amount input is now the expected max send for Cashtab's fee and an empty-space Cashtab Msg output
        expect(amountInputEl).toHaveValue(9508.97);

        // Clear the msg input and start again
        await user.clear(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
        );

        await user.type(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
            `How about a long-ish Cashtab msg with emojis 🎯😎`,
        );

        // We click "max" again to recalculate the max send amount
        await user.click(screen.getByText('max'));

        // Amount input is now the expected max send for Cashtab's fee and a Cashtab Msg output
        expect(amountInputEl).toHaveValue(9508.01);

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('We can send a tx with amount denominated in fiat currency', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        // This matches the mocked transaction that was created with the higher fee rate
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064413b207f573a7abb9ec0d149fa71cbde63272a0e6b58298a81bc39ac2001729205bd1e9284c9d5a268f7abe63c5c953bf932ac06c13e408341bde4e4807d7f2fe94121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0260ae0a00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acf7d30300000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'a6e905185097cc1ffb289ca366ff7322f8aaf95713d1e5d1a4e89663e609530f';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');
        // The user enters a valid address
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, addressInput);

        // Select USD from currency select
        const currencyDropdownMenu = screen.getByTestId(
            'currency-select-dropdown',
        );
        await user.selectOptions(
            screen.getByTestId('currency-select-dropdown'),
            screen.getByTestId('fiat-option'),
        );
        await waitFor(() => expect(currencyDropdownMenu).toHaveValue('USD'));
        // Send $0.21
        // 7000 satoshis at 0.00003 USD / XEC
        await user.type(amountInputEl, '0.21');

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('We can send an XEC tx to multiple users', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a210200000064411aa35b343dea193092b46c01b877677d595d854686655ae24a3387a10955656a7604dca1cae999239d8ae76dc16ec9db72560832e8a9b0fb09f4ba6e1fb384b14121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff03d0070000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac98080000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acab710e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'a306834359b3591c68dc3ee8227e5e10225e6ab3c5a7496ead6e119aaaf31635';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Select multi-send mode (expand Advanced first, then click Send to many)
        await user.click(screen.getByRole('button', { name: /Advanced/i }));
        await user.click(screen.getByRole('button', { name: 'Send to many' }));

        const multiSendInputEl = screen.getByPlaceholderText(
            /One address & amount per line/,
        );
        // The user enters a send to many input
        const multiSendInput =
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 20\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22';
        await user.type(multiSendInputEl, multiSendInput);

        // The send to many input field has this value
        expect(multiSendInputEl).toHaveValue(multiSendInput);

        // The Send button is enabled as we have valid multisend input
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );

        // Click Send
        await user.click(screen.getByRole('button', { name: 'Send' }));

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('Closing Advanced hides send-to-many controls and op_return_raw preview and clears advanced fields', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await user.click(screen.getByRole('button', { name: /Advanced/i }));
        await user.click(screen.getByRole('button', { name: 'Send to many' }));

        const multiSendInputEl = screen.getByPlaceholderText(
            /One address & amount per line/,
        );
        const multiSendInput =
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035, 20\necash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6, 22';
        await user.type(multiSendInputEl, multiSendInput);
        expect(multiSendInputEl).toHaveValue(multiSendInput);

        await user.click(screen.getByRole('button', { name: 'op_return_raw' }));
        const opReturnRawInput = screen.getByPlaceholderText(
            /Enter raw hex to be included with this transaction's OP_RETURN/,
        );
        const opReturnHex = '04deadbeef';
        await user.type(opReturnRawInput, opReturnHex);
        expect(opReturnRawInput).toHaveValue(opReturnHex);

        expect(screen.getByText('Parsed op_return_raw')).toBeInTheDocument();
        expect(screen.getByText('Unknown Protocol')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Advanced/i }));

        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'op_return_raw' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText('Parsed op_return_raw'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(
                /Enter raw hex to be included with this transaction's OP_RETURN/,
            ),
        ).not.toBeInTheDocument();
        expect(
            screen.getByPlaceholderText(/One address & amount per line/),
        ).toHaveValue('');
    });
    it('If we type a Cashtab msg, then disable the switch, we send a tx without our typed Cashtab message', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Can check in electrum for opreturn and amount
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441e11f1d96347ab50d56b111e9fd5ef68f9f1c69c76e1f8a65ec1fa58bd2e0eaee7a33b2c961ed5e58231c793b5d8a2950e2def6e7613df1055e681bc8f25d0a5b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff019c820e00000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac00000000';
        const txid =
            '521eda8ad78014c60374931dcc4e35f312847f9332e16cb846cd387a984e95d2';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for ecashWallet to be initialized (component renders after ecashWallet is set)
        const addressInputEl = await getRecipientInput();
        const amountInputEl = screen.getByPlaceholderText('Amount');
        // The user enters a valid BIP21 query string with a valid amount param
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, addressInput);

        // We click "max" to populate the Amount field
        await user.click(screen.getByText('max'));

        // Amount input is the expected max send for Cashtab's fee and no other outputs
        expect(amountInputEl).toHaveValue(9509.4);

        // Let's add a Cashtab message (expand Advanced first, then click Message)
        await user.click(screen.getByRole('button', { name: /Advanced/i }));
        await user.click(screen.getByRole('button', { name: 'Message' }));

        // Confirm that even a msg of blank spaces is added
        await user.type(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
            `     `,
        );

        // We click "max" again to recalculate the max send amount
        await user.click(screen.getByText('max'));

        // Amount input is now the expected max send for Cashtab's fee and an empty-space Cashtab Msg output
        expect(amountInputEl).toHaveValue(9508.97);

        // Clear the msg input and start again
        await user.clear(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
        );

        await user.type(
            screen.getByPlaceholderText(
                'Include a public Cashtab msg with this tx (max 215 bytes)',
            ),
            `How about a long-ish Cashtab msg with emojis 🎯😎`,
        );

        // We click "max" again to recalculate the max send amount
        await user.click(screen.getByText('max'));

        // Amount input is now the expected max send for Cashtab's fee and a Cashtab Msg output
        expect(amountInputEl).toHaveValue(9508.01);

        // Now we turn the Cashtab Msg off without clearing the input field
        await user.click(screen.getByRole('button', { name: 'Message' }));

        // Click max again to recalc max amount
        // Note: for now, it is not expected behavior onMax to recalculate as the tx changes, onMax
        // is always a user input
        // We click "max" to populate the Amount field
        await user.click(screen.getByText('max'));

        // We are back to our max send amount for no other outputs
        expect(amountInputEl).toHaveValue(9509.4);

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('Entering a valid bip21 query string with multiple outputs and op_return_raw will correctly populate UI fields, and the tx can be sent', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Can check in electrum for opreturn and multiple outputs
        const hex =
            '0200000001fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441d95dfbf01e233d19684fd525d1cc39eb82a53ebfc97b8f2f9160f418ce863f4360f9fd1d6c182abde1d582ed39c6998ec5e4cdbde1b09736f6abe390a6ab8d8f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000296a04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177a4060000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac40e20100000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88acca980c00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'f153119862f52dbe765ed5d66a5ff848d0386c5d987af9bef5e49a7e62a2c889';
        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        // The user enters a valid BIP21 query string with a valid amount param
        const op_return_raw =
            '04007461622263617368746162206d6573736167652077697468206f705f72657475726e5f726177';
        const addressInput = `ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=17&op_return_raw=${op_return_raw}&addr=ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035&amount=1234.56`;
        await user.type(addressInputEl, addressInput);

        // Valid BIP21 resolves; clear remains available for manually entered strings
        await expectResolvedRecipient(
            previewAddress(addressInput.split('?')[0]),
        );
        expect(
            screen.getByRole('button', { name: 'Clear recipient' }),
        ).toBeInTheDocument();

        // Advanced controls are hidden for BIP21 input
        expect(
            screen.queryByRole('button', { name: /Advanced/i }),
        ).not.toBeInTheDocument();

        // Because we have multiple outputs, the amount input is not displayed
        expect(screen.queryByPlaceholderText('Amount')).not.toBeInTheDocument();

        // Instead, we see a summary of total outputs and XEC to be sent
        expect(
            screen.getByText('BIP21: Sending 1,251.56 XEC to 2 outputs'),
        ).toBeInTheDocument();

        // BIP21 op_return_raw is rendered as parsed output, not editable input
        expect(screen.getByText('Parsed op_return_raw')).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText(
                `(Advanced) Enter raw hex to be included with this transaction's OP_RETURN`,
            ),
        ).not.toBeInTheDocument();

        // We see expected data in the op_return_raw preview
        expect(
            screen.getAllByText('cashtab message with op_return_raw')[0],
        ).toBeInTheDocument();

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The Send button is enabled as we have valid address and amount params
        expect(screen.getByRole('button', { name: 'Send' })).not.toHaveStyle(
            'cursor: not-allowed',
        );

        // We see a summary table of addresses and amounts
        expect(screen.getByText('Parsed BIP21 outputs')).toBeInTheDocument();
        expect(
            screen.getByText('qp89xg...9nhgg6, 17.00 XEC'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('qz2708...rf5035, 1,234.56 XEC'),
        ).toBeInTheDocument();

        // Click Send
        await user.click(
            screen.getByRole('button', { name: 'Send' }),
            addressInput,
        );

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eCash sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        await waitFor(() =>
            // The op_return_raw set alert is now removed
            expect(
                screen.queryByText(
                    `Hex OP_RETURN "04007461622263617368746162206D6573736167652077697468206F705F72657475726E5F726177" set by BIP21`,
                ),
            ).not.toBeInTheDocument(),
        );
        // The amount input is no longer hidden
        expect(
            await screen.findByPlaceholderText('Amount'),
        ).toBeInTheDocument();
        // Amount input is reset
        expect(await screen.findByPlaceholderText('Amount')).toHaveValue(null);
        // The 'Send To' input field has been cleared
        expect(await getRecipientInput()).toHaveValue('');
    });
    it('Entering a valid bip21 query string for a token send tx does not render a populated token tx and shows a query error if Cashtab is unable to fetch the token info', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        const mockTokenId =
            '2222222222222222222222222222222222222222222222222222222222222222';

        // Mock API calls for fetching this token info from cache
        const token_id = mockTokenId;
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(token_id, new Error('some chronik error'));
        mockedChronik.setTx(token_id, slp1FixedBear.tx);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        // The user enters a valid BIP21 query string with a valid amount param
        // Simulate pasting/scanning the full BIP21 string at once (not typing character-by-character)

        const token_decimalized_qty = '1';
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const addressInput = `${address}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}`;
        // Use fireEvent.input to set the value, then fireEvent.change to trigger the handler
        // This simulates a paste/scan where the full value is set at once
        fireEvent.input(addressInputEl, { target: { value: addressInput } });
        fireEvent.change(addressInputEl, { target: { value: addressInput } });

        // Wait for token mode to be activated (recipient resolves from bip21)
        await screen.findByRole('status', { name: /Recipient / });
        expect(
            screen.getByRole('button', { name: 'Clear recipient' }),
        ).toBeInTheDocument();

        // The "Send to many" button should not be visible in token mode (XEC form not shown)
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // Even though we have a query error, the token amount input is visible
        // because the amount came from the BIP21 string (token_decimalized_qty)
        let amountInputEl = screen.getByPlaceholderText('Amount');
        expect(amountInputEl).toHaveValue(token_decimalized_qty);
        // The amount input should be disabled because token_decimalized_qty is specified in the BIP21 string
        expect(amountInputEl).toBeDisabled();

        // We see a token ID query error if chronik cannot get this token's genesis info
        await waitFor(() => {
            expect(
                screen.getByText(`Error querying token info for ${token_id}`),
            ).toBeInTheDocument();
        });

        // The send button is disabled as we cannot build a send token tx without the genesis info
        await waitFor(() => {
            const sendButton = screen.getByRole('button', { name: 'Send' });
            expect(sendButton).toBeDisabled();
        });
    });
    it('SLP1 Fungible: Entering a valid bip21 query string for a token send tx will correcty populate the UI, and the tx can be sent', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Token send tx
        const hex =
            '0200000002fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441130d7c6c22a2d1e70a09c49914f2ccd069cf4875a587c925c2bb0e2667523a4041114b913046074ec38a75b3f6cebd4222c103161ade90a12950a8b6eac793404121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff3023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b010000006441857ca138d4a9c7c6799f40c07208f02dbee64f12d05eac847ea94bcc70653ab00847947bf6eba1613f558f5bd5ba5641f2326a8ffffacaf9e6091b478fecf3914121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10908000000000000000122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acbb800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '51a8563071344337682fff1c64219fd366e4fcc979d6a9853f612062e70eb0ca';
        mockedChronik.setBroadcastTx(hex, txid);

        // Mock API calls for fetching this token info from cache
        const token_id = slp1FixedBear.tokenId;
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(slp1FixedBear.tokenId, slp1FixedBear.token);
        mockedChronik.setTx(slp1FixedBear.tokenId, slp1FixedBear.tx);

        const { tokenName, tokenTicker } = slp1FixedBear.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        // The user enters a valid BIP21 query string with a valid amount param
        // Simulate pasting/scanning the full BIP21 string at once (not typing character-by-character)

        const token_decimalized_qty = '1';
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const addressInput = `${address}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}`;
        // Use fireEvent.input to set the value, then fireEvent.change to trigger the handler
        // This simulates a paste/scan where the full value is set at once
        fireEvent.input(addressInputEl, { target: { value: addressInput } });
        fireEvent.change(addressInputEl, { target: { value: addressInput } });

        // Wait for token mode to be activated (recipient resolves from bip21)
        await screen.findByRole('status', { name: /Recipient / });
        expect(
            screen.getByRole('button', { name: 'Clear recipient' }),
        ).toBeInTheDocument();

        // The "Send to many" button should not be visible in token mode (XEC form not shown)
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // The token amount input is visible and populated from the BIP21 string
        const amountInputEl = screen.getByPlaceholderText('Amount');
        expect(amountInputEl).toBeInTheDocument();
        expect(amountInputEl).toHaveValue(token_decimalized_qty);
        // The amount input should be disabled because token_decimalized_qty is specified in the BIP21 string
        expect(amountInputEl).toBeDisabled();

        // We do not see a token ID query error
        expect(
            screen.queryByText(`Error querying token info for ${token_id}`),
        ).not.toBeInTheDocument();

        // We see the parsed tx
        const addressPreview = `${address.slice(
            0,
            'ecash:'.length + 3,
        )}...${address.slice(-3)}`;
        expect(
            screen.getByText(
                `Sending ${token_decimalized_qty} ${tokenName} (${tokenTicker}) to ${addressPreview}`,
            ),
        ).toBeInTheDocument();

        // The send button is enabled as we have valid bip21 token send for a token qty supported
        // by the wallet
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg and op_return_raw switches are not visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'op_return_raw' }),
        ).not.toBeInTheDocument();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        // After sending, the form is cleared - token mode may be reset or amount input may not be visible
        // This is expected behavior after a successful transaction
    });
    it('SLP1 Fungible: Entering a bip21 query string with firma param shows validation error', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Mock API calls for fetching this token info from cache
        const token_id = slp1FixedBear.tokenId;
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(slp1FixedBear.tokenId, slp1FixedBear.token);
        mockedChronik.setTx(slp1FixedBear.tokenId, slp1FixedBear.tx);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        // The user enters a BIP21 query string with firma param for an SLP token
        // This should show a validation error since firma is only valid for ALP tokens
        const token_decimalized_qty = '1';
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const firma =
            '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745';
        const addressInput = `${address}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}&firma=${firma}`;
        // Use fireEvent.input to set the value, then fireEvent.change to trigger the handler
        // This simulates a paste/scan where the full value is set at once
        fireEvent.input(addressInputEl, { target: { value: addressInput } });
        fireEvent.change(addressInputEl, { target: { value: addressInput } });

        // Wait for token mode to be activated; firma error keeps recipient field editable
        const tokenAddressInputEl =
            await screen.findByPlaceholderText('Address or contact');
        await waitFor(() => {
            expect(tokenAddressInputEl).toHaveValue(addressInput);
        });

        // The "Send to many" button should not be visible in token mode (XEC form not shown)
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // The token mode 'Send To' input field is not disabled (user-entered BIP21)
        expect(tokenAddressInputEl).toHaveProperty('disabled', false);

        // Wait for token info to be fetched and validation error to appear
        await waitFor(() => {
            expect(
                screen.getByText(
                    'Cannot include firma for a token type other than ALP_TOKEN_TYPE_STANDARD',
                ),
            ).toBeInTheDocument();
        });

        // The send button should be disabled due to the validation error
        await waitFor(() => {
            const sendButton = screen.getByRole('button', { name: 'Send' });
            expect(sendButton).toBeDisabled();
        });

        // The token amount input is visible
        // Note: When there's a validation error, the amount is not set from token_decimalized_qty
        // because the validation error prevents it (tokenRenderedError must be false to set amount)
        const amountInputEl = screen.getByPlaceholderText('Amount');
        expect(amountInputEl).toBeInTheDocument();
        // The amount input should be empty because the validation error prevents it from being set
        expect(amountInputEl).toHaveValue('');

        // We do not see a token ID query error (token info was successfully fetched)
        expect(
            screen.queryByText(`Error querying token info for ${token_id}`),
        ).not.toBeInTheDocument();
    });
    it('ALP Fungible: Entering a valid bip21 query string for a token send tx will correcty populate the UI, and the tx can be sent', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Token send tx
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf79261803000000644160d959e0008ec5b21cb927fd5196ce6e37803a63ff85c22e6659b6c77946c724c3703e3bea8d31338520e3924065e78ace4b484605a0ec34cc712a65717a41354121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c2501000000644199e25f1c1f8e110260ee39baef7149c181a4d1d3cdc9fc8d505e7875e1f77b356339d1f33bdf0a1ab0dce567cbc9b23e071cf1d6d1d5854c1be86c0a7a9a981a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0400000000000000003a6a5037534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c02102700000000301b0f00000022020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac18310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '9f08db20bf0cbf7cc590e6d0139e370a1338bde2c7fab7755342a0bf473d9ec4';
        mockedChronik.setBroadcastTx(hex, txid);
        // Mock API calls for fetching this token info from cache
        const token_id = alpMocks.tokenId;
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(alpMocks.tokenId, alpMocks.token);
        mockedChronik.setTx(alpMocks.tokenId, alpMocks.tx);

        const { tokenName, tokenTicker } = alpMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        // The user enters a valid BIP21 query string with a valid amount param
        // Simulate pasting/scanning the full BIP21 string at once (not typing character-by-character)

        const token_decimalized_qty = '1';
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const addressInput = `${address}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}`;
        // Use fireEvent.input to set the value, then fireEvent.change to trigger the handler
        // This simulates a paste/scan where the full value is set at once
        fireEvent.input(addressInputEl, { target: { value: addressInput } });
        fireEvent.change(addressInputEl, { target: { value: addressInput } });

        // Wait for token mode to be activated (recipient resolves from bip21)
        await screen.findByRole('status', { name: /Recipient / });
        expect(
            screen.getByRole('button', { name: 'Clear recipient' }),
        ).toBeInTheDocument();

        // The "Send to many" button should not be visible in token mode (XEC form not shown)
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // The token amount input is visible and populated from the BIP21 string
        const amountInputEl = screen.getByPlaceholderText('Amount');
        expect(amountInputEl).toBeInTheDocument();
        expect(amountInputEl).toHaveValue(token_decimalized_qty);
        // The amount input should be disabled because token_decimalized_qty is specified in the BIP21 string
        expect(amountInputEl).toBeDisabled();

        // We do not see a token ID query error
        expect(
            screen.queryByText(`Error querying token info for ${token_id}`),
        ).not.toBeInTheDocument();

        // We see the parsed tx
        const addressPreview = `${address.slice(
            0,
            'ecash:'.length + 3,
        )}...${address.slice(-3)}`;
        expect(
            screen.getByText(
                `Sending ${token_decimalized_qty} ${tokenName} (${tokenTicker}) to ${addressPreview}`,
            ),
        ).toBeInTheDocument();

        // The send button is enabled as we have valid bip21 token send for a token qty supported
        // by the wallet
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg and op_return_raw switches are not visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'op_return_raw' }),
        ).not.toBeInTheDocument();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        // After sending, the form is cleared - token mode may be reset or amount input may not be visible
        // This is expected behavior after a successful transaction
    });
    it('Send Token: Searching contacts shows matches; selecting one resolves and send works', async () => {
        const mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );
        await localforage.setItem('contactList', populatedContactList);
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY,
        });

        // Same hex as ALP Fungible token mode UI send to alpha contact address
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf79261803000000644160d959e0008ec5b21cb927fd5196ce6e37803a63ff85c22e6659b6c77946c724c3703e3bea8d31338520e3924065e78ace4b484605a0ec34cc712a65717a41354121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c2501000000644199e25f1c1f8e110260ee39baef7149c181a4d1d3cdc9fc8d505e7875e1f77b356339d1f33bdf0a1ab0dce567cbc9b23e071cf1d6d1d5854c1be86c0a7a9a981a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0400000000000000003a6a5037534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c02102700000000301b0f00000022020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac18310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '9f08db20bf0cbf7cc590e6d0139e370a1338bde2c7fab7755342a0bf473d9ec4';
        mockedChronik.setBroadcastTx(hex, txid);
        mockedChronik.setToken(alpMocks.tokenId, alpMocks.token);
        mockedChronik.setTx(alpMocks.tokenId, alpMocks.tx);

        const { tokenTicker } = alpMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await user.click(
            await screen.findByRole('link', { name: /Send Token/i }),
        );
        await screen.findByPlaceholderText('Search by token ticker or name');
        await user.type(
            screen.getByPlaceholderText('Search by token ticker or name'),
            tokenTicker,
        );
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });
        await user.click(screen.getByText(tokenTicker).closest('div'));

        const addressInputEl = await getRecipientInput();
        await user.type(addressInputEl, 'alp');
        expect(
            await screen.findByRole('button', { name: 'alpha' }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'alpha' }));
        await expectResolvedRecipient('alpha');

        const amountInputEl = screen.getByPlaceholderText('Amount');
        await user.type(amountInputEl, '1');

        await user.click(screen.getByRole('button', { name: 'Send' }));
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('ALP Fungible: We can send an ALP token using the token mode UI', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Token send tx - same hex and txid as BIP21 test
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf79261803000000644160d959e0008ec5b21cb927fd5196ce6e37803a63ff85c22e6659b6c77946c724c3703e3bea8d31338520e3924065e78ace4b484605a0ec34cc712a65717a41354121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c2501000000644199e25f1c1f8e110260ee39baef7149c181a4d1d3cdc9fc8d505e7875e1f77b356339d1f33bdf0a1ab0dce567cbc9b23e071cf1d6d1d5854c1be86c0a7a9a981a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0400000000000000003a6a5037534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c02102700000000301b0f00000022020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac18310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '9f08db20bf0cbf7cc590e6d0139e370a1338bde2c7fab7755342a0bf473d9ec4';
        mockedChronik.setBroadcastTx(hex, txid);

        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(alpMocks.tokenId, alpMocks.token);
        mockedChronik.setTx(alpMocks.tokenId, alpMocks.tx);

        const { tokenTicker } = alpMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Switch to token mode via Send Token link
        const sendTokenLink = await screen.findByRole('link', {
            name: /Send Token/i,
        });
        expect(sendTokenLink).toBeInTheDocument();
        await user.click(sendTokenLink);

        // Wait for token mode UI to appear
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText('Search by token ticker or name'),
            ).toBeInTheDocument();
        });

        // The "Send to Many" switch should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // Search for the token by ticker
        const tokenSearchInput = screen.getByPlaceholderText(
            'Search by token ticker or name',
        );
        await user.type(tokenSearchInput, tokenTicker);

        // Wait for dropdown to appear with token
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });

        // Click on the token in the dropdown to select it
        // The token ticker text should be clickable within the dropdown item
        const tokenTickerElement = screen.getByText(tokenTicker);
        // Click on the parent div that has the onClick handler
        await user.click(tokenTickerElement.closest('div'));

        // Wait for token to be selected and address/amount inputs to appear
        // The search input should be replaced with the selected token display
        await waitFor(() => {
            const addressInput =
                screen.queryByPlaceholderText('Address or contact');
            expect(addressInput).toBeInTheDocument();
        });

        // Verify the selected token ticker is displayed in the selected token display
        // The search input should no longer be visible (replaced by SelectedTokenDisplay)
        expect(
            screen.queryByPlaceholderText('Search by token ticker or name'),
        ).not.toBeInTheDocument();
        // The token ticker should be visible in the selected token display
        expect(screen.getByText(tokenTicker)).toBeInTheDocument();

        // Enter address
        const addressInputEl =
            screen.getByPlaceholderText('Address or contact');
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, address);
        expect(addressInputEl).toHaveValue(address);

        // Enter amount
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const token_decimalized_qty = '1';
        await user.type(amountInputEl, token_decimalized_qty);
        expect(amountInputEl).toHaveValue(token_decimalized_qty);

        // The send button should be enabled
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg and op_return_raw switches should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'op_return_raw' }),
        ).not.toBeInTheDocument();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );

        // Form should be cleared after successful send
        await waitFor(() => {
            expect(
                screen.queryByPlaceholderText('Address or contact'),
            ).toHaveValue('');
        });
    });
    it('SLP1 Fungible: We can send an SLP token using the token mode UI', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokensActive,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Token send tx - same hex and txid as BIP21 test
        const hex =
            '0200000002fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441130d7c6c22a2d1e70a09c49914f2ccd069cf4875a587c925c2bb0e2667523a4041114b913046074ec38a75b3f6cebd4222c103161ade90a12950a8b6eac793404121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff3023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b010000006441857ca138d4a9c7c6799f40c07208f02dbee64f12d05eac847ea94bcc70653ab00847947bf6eba1613f558f5bd5ba5641f2326a8ffffacaf9e6091b478fecf3914121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10908000000000000000122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acbb800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '51a8563071344337682fff1c64219fd366e4fcc979d6a9853f612062e70eb0ca';
        mockedChronik.setBroadcastTx(hex, txid);

        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(slp1FixedBear.tokenId, slp1FixedBear.token);
        mockedChronik.setTx(slp1FixedBear.tokenId, slp1FixedBear.tx);

        const { tokenTicker } = slp1FixedBear.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Switch to token mode via Send Token link
        const sendTokenLink = await screen.findByRole('link', {
            name: /Send Token/i,
        });
        expect(sendTokenLink).toBeInTheDocument();
        await user.click(sendTokenLink);

        // Wait for token mode UI to appear
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText('Search by token ticker or name'),
            ).toBeInTheDocument();
        });

        // The "Send to Many" switch should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // Search for the token by ticker
        const tokenSearchInput = screen.getByPlaceholderText(
            'Search by token ticker or name',
        );
        await user.type(tokenSearchInput, tokenTicker);

        // Wait for dropdown to appear with token
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });

        // Click on the token in the dropdown to select it
        // The token ticker text should be clickable within the dropdown item
        const tokenTickerElement = screen.getByText(tokenTicker);
        // Click on the parent div that has the onClick handler
        await user.click(tokenTickerElement.closest('div'));

        // Wait for token to be selected and address/amount inputs to appear
        // The search input should be replaced with the selected token display
        await waitFor(() => {
            const addressInput =
                screen.queryByPlaceholderText('Address or contact');
            expect(addressInput).toBeInTheDocument();
        });

        // Verify the selected token ticker is displayed in the selected token display
        // The search input should no longer be visible (replaced by SelectedTokenDisplay)
        expect(
            screen.queryByPlaceholderText('Search by token ticker or name'),
        ).not.toBeInTheDocument();
        // The token ticker should be visible in the selected token display
        expect(screen.getByText(tokenTicker)).toBeInTheDocument();

        // Enter address
        const addressInputEl =
            screen.getByPlaceholderText('Address or contact');
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, address);
        expect(addressInputEl).toHaveValue(address);

        // Enter amount
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const token_decimalized_qty = '1';
        await user.type(amountInputEl, token_decimalized_qty);
        expect(amountInputEl).toHaveValue(token_decimalized_qty);

        // The send button should be enabled
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg and op_return_raw switches should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'op_return_raw' }),
        ).not.toBeInTheDocument();
        // EMPP buttons should not be visible for SLP tokens (only ALP tokens have them)
        expect(
            screen.queryByRole('button', { name: 'Cashtab Msg' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'empp_raw' }),
        ).not.toBeInTheDocument();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );

        // Form should be cleared after successful send
        await waitFor(() => {
            expect(
                screen.queryByPlaceholderText('Address or contact'),
            ).toHaveValue('');
        });
    });
    it('SLP1 NFT Parent: We can send an SLP NFT parent token using the token mode UI', async () => {
        // Mock the app with context at the Send screen
        // Note: NFT parent tokens are sent like fungible tokens
        // We need to add the NFT parent token to the wallet's slpUtxos
        const mockedChronik = await initializeCashtabStateForTests(
            {
                ...tokenTestWallet,
                state: {
                    ...tokenTestWallet.state,
                    slpUtxos: [
                        ...tokenTestWallet.state.slpUtxos,
                        {
                            outpoint: {
                                txid: '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                                outIdx: 1,
                            },
                            blockHeight: 840011,
                            isCoinbase: false,
                            sats: 546n,
                            isFinal: true,
                            token: {
                                tokenId:
                                    '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                    number: 129,
                                },
                                atoms: 100n,
                                isMintBaton: false,
                            },
                        },
                    ],
                },
            },
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Token send tx - NFT parent tokens are sent like fungible tokens
        // This hex/txid will be generated when the actual transaction is created
        // For now, using a placeholder structure similar to SLP fungible sends
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441730e02f2c44b30cb013847f161e1454ab0e91eddca2deb00111c4b457f9dedb0592db3735f440fab9df19e9e8cfc9865f3f570a0cca80790e455456803665f9c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffcc04a35686950a66845ebf8e37677fffcc5ee0e2b63e3f05822838273149660c0100000064416c7c983d8352591fbe1e7228d50e005c0fd23be8eed39a33954146fcec94e3b0b8bab4934fb079c3fb4a55fefec4b1c07b4c0288c523f114b523a5338666666b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001810453454e44200c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc08000000000000000108000000000000006322020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac0c310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '5e0b4ec304399e588032ad01fb140375dac39a3635fd05c65ff38d5a72e9f9fd';
        mockedChronik.setBroadcastTx(hex, txid);

        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(
            slp1NftParentMocks.tokenId,
            slp1NftParentMocks.token,
        );
        mockedChronik.setTx(slp1NftParentMocks.tokenId, slp1NftParentMocks.tx);

        const { tokenTicker } = slp1NftParentMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Switch to token mode via Send Token link
        const sendTokenLink = await screen.findByRole('link', {
            name: /Send Token/i,
        });
        expect(sendTokenLink).toBeInTheDocument();
        await user.click(sendTokenLink);

        // Wait for token mode UI to appear
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText('Search by token ticker or name'),
            ).toBeInTheDocument();
        });

        // The "Send to Many" switch should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // Search for the token by ticker
        const tokenSearchInput = screen.getByPlaceholderText(
            'Search by token ticker or name',
        );
        await user.type(tokenSearchInput, tokenTicker);

        // Wait for dropdown to appear with token
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });

        // Click on the token in the dropdown to select it
        // The token ticker text should be clickable within the dropdown item
        const tokenTickerElement = screen.getByText(tokenTicker);
        // Click on the parent div that has the onClick handler
        await user.click(tokenTickerElement.closest('div'));

        // Wait for token to be selected and address/amount inputs to appear
        // The search input should be replaced with the selected token display
        await waitFor(() => {
            const addressInput =
                screen.queryByPlaceholderText('Address or contact');
            expect(addressInput).toBeInTheDocument();
        });

        // Verify the selected token ticker is displayed in the selected token display
        // The search input should no longer be visible (replaced by SelectedTokenDisplay)
        expect(
            screen.queryByPlaceholderText('Search by token ticker or name'),
        ).not.toBeInTheDocument();
        // The token ticker should be visible in the selected token display
        expect(screen.getByText(tokenTicker)).toBeInTheDocument();

        // Enter address
        const addressInputEl =
            screen.getByPlaceholderText('Address or contact');
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, address);
        expect(addressInputEl).toHaveValue(address);

        // Enter amount (NFT parent tokens can be sent in quantities like fungible tokens)
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const token_decimalized_qty = '1';
        await user.type(amountInputEl, token_decimalized_qty);
        expect(amountInputEl).toHaveValue(token_decimalized_qty);

        // The send button should be enabled
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg and op_return_raw switches should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'op_return_raw' }),
        ).not.toBeInTheDocument();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );

        // Form should be cleared after successful send
        await waitFor(() => {
            expect(
                screen.queryByPlaceholderText('Address or contact'),
            ).toHaveValue('');
        });
    });
    it('SLP1 NFT Child: We can send an SLP NFT using the token mode UI', async () => {
        // Mock the app with context at the Send screen
        // We need to add the NFT child token to the wallet's slpUtxos
        const mockedChronik = await initializeCashtabStateForTests(
            {
                ...tokenTestWallet,
                state: {
                    ...tokenTestWallet.state,
                    slpUtxos: [
                        ...tokenTestWallet.state.slpUtxos,
                        {
                            outpoint: {
                                txid: '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                                outIdx: 1,
                            },
                            blockHeight: 841509,
                            isCoinbase: false,
                            sats: 546n,
                            isFinal: true,
                            token: {
                                tokenId:
                                    '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                                    number: 65,
                                },
                                atoms: 1n,
                                isMintBaton: false,
                            },
                        },
                    ],
                },
            },
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // NFT send tx - same hex and txid as BIP21 test
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064416d9ee69f021b5fe5f7e0b6535646bb3a6864c67bc4f94e46f13aa31dbdca82d0c59a1e12ee32b6c5cb5b208e92f7b62b8de77d02ad5827c87041f51649757a844121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d01000000644180351db90eba363427a44cba71c139dc9c8715b63ba0673d0768ae73a569517d4509547c761f082cd127496f0dded496f5d616ac1397973109e84c2327e9666a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a222832608000000000000000122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac84330f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'b729cee8be5f264750e9b2c764b2a2893cc78b14968bc0634da2f3d429a16e04';
        mockedChronik.setBroadcastTx(hex, txid);

        // Set chronik mocks required for cache preparation
        mockedChronik.setToken(
            slp1NftChildMocks.tokenId,
            slp1NftChildMocks.token,
        );
        mockedChronik.setTx(slp1NftChildMocks.tokenId, slp1NftChildMocks.tx);

        const { tokenTicker } = slp1NftChildMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Switch to token mode via Send Token link
        const sendTokenLink = await screen.findByRole('link', {
            name: /Send Token/i,
        });
        expect(sendTokenLink).toBeInTheDocument();
        await user.click(sendTokenLink);

        // Wait for token mode UI to appear
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText('Search by token ticker or name'),
            ).toBeInTheDocument();
        });

        // The "Send to Many" switch should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // Search for the token by ticker
        const tokenSearchInput = screen.getByPlaceholderText(
            'Search by token ticker or name',
        );
        await user.type(tokenSearchInput, tokenTicker);

        // Wait for dropdown to appear with token
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });

        // Click on the token in the dropdown to select it
        // The token ticker text should be clickable within the dropdown item
        const tokenTickerElement = screen.getByText(tokenTicker);
        // Click on the parent div that has the onClick handler
        await user.click(tokenTickerElement.closest('div'));

        // Wait for token to be selected and address/amount inputs to appear
        // The search input should be replaced with the selected token display
        await waitFor(() => {
            const addressInput =
                screen.queryByPlaceholderText('Address or contact');
            expect(addressInput).toBeInTheDocument();
        });

        // Verify the selected token ticker is displayed in the selected token display
        // The search input should no longer be visible (replaced by SelectedTokenDisplay)
        expect(
            screen.queryByPlaceholderText('Search by token ticker or name'),
        ).not.toBeInTheDocument();
        // The token ticker should be visible in the selected token display
        expect(screen.getByText(tokenTicker)).toBeInTheDocument();

        // Enter address
        const addressInputEl =
            screen.getByPlaceholderText('Address or contact');
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, address);
        expect(addressInputEl).toHaveValue(address);

        // Enter amount (NFTs are always sent as 1, but the input still requires a value)
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const token_decimalized_qty = '1';
        await user.type(amountInputEl, token_decimalized_qty);
        expect(amountInputEl).toHaveValue(token_decimalized_qty);

        // The send button should be enabled
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg and op_return_raw switches should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'op_return_raw' }),
        ).not.toBeInTheDocument();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid (NFTs show "NFT sent" instead of "eToken sent")
        const txSuccessNotification = await screen.findByText('NFT sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );

        // Form should be cleared after successful send
        await waitFor(() => {
            expect(
                screen.queryByPlaceholderText('Address or contact'),
            ).toHaveValue('');
        });
    });
    it('SLP2 Mint Vault: We can send a mint vault token using the token mode UI', async () => {
        // Mock the app with context at the Send screen
        // We need to add the mint vault token to the wallet's slpUtxos
        const mockedChronik = await initializeCashtabStateForTests(
            {
                ...tokenTestWallet,
                state: {
                    ...tokenTestWallet.state,
                    slpUtxos: [
                        ...tokenTestWallet.state.slpUtxos,
                        {
                            outpoint: {
                                txid: '8ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251',
                                outIdx: 1,
                            },
                            blockHeight: 897132,
                            isCoinbase: false,
                            sats: 546n,
                            isFinal: true,
                            token: {
                                tokenId:
                                    '8ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_MINT_VAULT',
                                    number: 2,
                                },
                                atoms: 10_000_000n,
                                isMintBaton: false,
                            },
                        },
                    ],
                },
            },
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Mint vault send tx - same hex and txid as TokenActions test
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441bd412de68ed26d6e038e04ac4974000106c916c122d5a6c4aa6458317100d43a1d3184906286d3286b9dd74c712b868e3668966c6edf9719c1fc844b7ea2a9634121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffe227ad0b23242a4678fc79104cdf1c80914862a3c808066aebc65ef35b52b56f01000000644105d8ab490001c5822f7afdd59f6051a2b2ea6100bf7e38e936c1724970e413c265e10b0b4fabdc66ccc1da89709e46020f008ccb4007c653cd888437e27bf8514121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001020453454e44208ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba325108000000000000000108000000000001869f22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac0c310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '183cda9bc36776610c3a304365b0e4fe76116e0f97bf99197df4de179e779ca6';
        mockedChronik.setBroadcastTx(hex, txid);

        // Set chronik mocks required for cache preparation
        mockedChronik.setToken(
            slpMintVaultMocks.tokenId,
            slpMintVaultMocks.token,
        );
        mockedChronik.setTx(slpMintVaultMocks.tokenId, slpMintVaultMocks.tx);

        const { tokenTicker } = slpMintVaultMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Switch to token mode via Send Token link
        const sendTokenLink = await screen.findByRole('link', {
            name: /Send Token/i,
        });
        expect(sendTokenLink).toBeInTheDocument();
        await user.click(sendTokenLink);

        // Wait for token mode UI to appear
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText('Search by token ticker or name'),
            ).toBeInTheDocument();
        });

        // The "Send to Many" switch should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // Search for the token by ticker
        const tokenSearchInput = screen.getByPlaceholderText(
            'Search by token ticker or name',
        );
        await user.type(tokenSearchInput, tokenTicker);

        // Wait for dropdown to appear with token
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });

        // Click on the token in the dropdown to select it
        // The token ticker text should be clickable within the dropdown item
        const tokenTickerElement = screen.getByText(tokenTicker);
        // Click on the parent div that has the onClick handler
        await user.click(tokenTickerElement.closest('div'));

        // Wait for token to be selected and address/amount inputs to appear
        // The search input should be replaced with the selected token display
        await waitFor(() => {
            const addressInput =
                screen.queryByPlaceholderText('Address or contact');
            expect(addressInput).toBeInTheDocument();
        });

        // Verify the selected token ticker is displayed in the selected token display
        // The search input should no longer be visible (replaced by SelectedTokenDisplay)
        expect(
            screen.queryByPlaceholderText('Search by token ticker or name'),
        ).not.toBeInTheDocument();
        // The token ticker should be visible in the selected token display
        expect(screen.getByText(tokenTicker)).toBeInTheDocument();

        // Enter address
        const addressInputEl =
            screen.getByPlaceholderText('Address or contact');
        const address = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
        await user.type(addressInputEl, address);
        expect(addressInputEl).toHaveValue(address);

        // Enter amount
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const token_decimalized_qty = '1';
        await user.type(amountInputEl, token_decimalized_qty);
        expect(amountInputEl).toHaveValue(token_decimalized_qty);

        // The send button should be enabled
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg and op_return_raw switches should not be visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'op_return_raw' }),
        ).not.toBeInTheDocument();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );

        // Form should be cleared after successful send
        await waitFor(() => {
            expect(
                screen.queryByPlaceholderText('Address or contact'),
            ).toHaveValue('');
        });
    });
    it('SLP1 NFT Child: Entering a valid bip21 query string for a token send tx will correcty populate the UI, and the tx can be sent', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // Token send tx
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064416d9ee69f021b5fe5f7e0b6535646bb3a6864c67bc4f94e46f13aa31dbdca82d0c59a1e12ee32b6c5cb5b208e92f7b62b8de77d02ad5827c87041f51649757a844121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d01000000644180351db90eba363427a44cba71c139dc9c8715b63ba0673d0768ae73a569517d4509547c761f082cd127496f0dded496f5d616ac1397973109e84c2327e9666a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a222832608000000000000000122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac84330f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'b729cee8be5f264750e9b2c764b2a2893cc78b14968bc0634da2f3d429a16e04';
        mockedChronik.setBroadcastTx(hex, txid);

        // Mock API calls for fetching this token info from cache
        const token_id = slp1NftChildMocks.tokenId;
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(
            slp1NftChildMocks.tokenId,
            slp1NftChildMocks.token,
        );
        mockedChronik.setTx(slp1NftChildMocks.tokenId, slp1NftChildMocks.tx);

        const { tokenName, tokenTicker } = slp1NftChildMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        // The user enters a valid BIP21 query string with a valid amount param
        // Simulate pasting/scanning the full BIP21 string at once (not typing character-by-character)

        const token_decimalized_qty = '1';
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const addressInput = `${address}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}`;
        // Use fireEvent.input to set the value, then fireEvent.change to trigger the handler
        // This simulates a paste/scan where the full value is set at once
        fireEvent.input(addressInputEl, { target: { value: addressInput } });
        fireEvent.change(addressInputEl, { target: { value: addressInput } });

        // Wait for token mode to be activated (recipient resolves from bip21)
        await screen.findByRole('status', { name: /Recipient / });
        expect(
            screen.getByRole('button', { name: 'Clear recipient' }),
        ).toBeInTheDocument();

        // The "Send to many" button should not be visible in token mode (XEC form not shown)
        expect(
            screen.queryByRole('button', { name: 'Send to many' }),
        ).not.toBeInTheDocument();

        // The token amount input is visible and populated from the BIP21 string
        const amountInputEl = screen.getByPlaceholderText('Amount');
        expect(amountInputEl).toBeInTheDocument();
        expect(amountInputEl).toHaveValue(token_decimalized_qty);
        // The amount input should be disabled because token_decimalized_qty is specified in the BIP21 string
        expect(amountInputEl).toBeDisabled();

        // We do not see a token ID query error
        expect(
            screen.queryByText(`Error querying token info for ${token_id}`),
        ).not.toBeInTheDocument();

        // We see the parsed tx
        const addressPreview = `${address.slice(
            0,
            'ecash:'.length + 3,
        )}...${address.slice(-3)}`;
        expect(
            screen.getByText(
                `Sending ${token_decimalized_qty} ${tokenName} (${tokenTicker}) to ${addressPreview}`,
            ),
        ).toBeInTheDocument();

        // The send button is enabled as we have valid bip21 token send for a token qty supported
        // by the wallet
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // The Cashtab Msg and op_return_raw switches are not visible in token mode
        expect(
            screen.queryByRole('button', { name: 'Message' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'op_return_raw' }),
        ).not.toBeInTheDocument();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('NFT sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
        // After sending, the form is cleared - token mode may be reset or amount input may not be visible
        // This is expected behavior after a successful transaction
    });
    it('We can parse a valid FIRMA-USDC redeem tx from bip21 and broadcast the tx', async () => {
        const destinationAddress = FIRMA_REDEEM_ADDRESS;
        const token_id = FIRMA.tokenId;
        const token_decimalized_qty = '5';
        // Cashtab msg included under the "firma" param for some reason
        const firma =
            '534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf745';

        const bip21Str = `${destinationAddress}?token_id=${token_id}&token_decimalized_qty=${token_decimalized_qty}&firma=${firma}`;

        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

        // FIRMA redeem send tx
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf79261803000000644137abfbff180a6c34419897c0b902428fa476a598f1530c3c1e327d8523c05252d3fea96fc82c1cb300c11abbd173bfebdf83c13192bfbf2811b774b1749cf9374121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c250100000064415f8d9a2d066524649e91166e8239e521011c993bc554de404f8d3c85cd31e27c5201a40b9eed1153bf3489ff2479369f2d74d01028333687b4721348516438174121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0400000000000000005f6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f9487030250c300000000f07e0e00000024534f4c304ebabba2b443691c1a9180426004d5fd3419e9f9c64e5839b853cecdaacbf74522020000000000001976a914cf76d8e334b149cb49ad1f95de339c3e6e9ed54188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188acce300f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'a78f950ede3f968d41f297e27dd47130f1c25fb025dd85c167f1df4e600b827f';
        mockedChronik.setBroadcastTx(hex, txid);

        // Make sure FIRMA is cached
        mockedChronik.setTx(FIRMA.tx.txid, FIRMA.tx);
        mockedChronik.setToken(FIRMA.tokenId, FIRMA.token);
        render(<CashtabTestWrapper chronik={mockedChronik} route="/send" />);

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        // Simulate pasting/scanning the full BIP21 string at once (not typing character-by-character)
        fireEvent.input(addressInputEl, { target: { value: bip21Str } });
        fireEvent.change(addressInputEl, { target: { value: bip21Str } });

        // Wait for token mode to be activated (recipient resolves from bip21)
        await screen.findByRole('status', { name: /Recipient / });
        expect(
            screen.getByRole('button', { name: 'Clear recipient' }),
        ).toBeInTheDocument();

        // The token amount input is visible and populated from the BIP21 string
        const amountInputEl = screen.getByPlaceholderText('Amount');
        expect(amountInputEl).toBeInTheDocument();
        expect(amountInputEl).toHaveValue(token_decimalized_qty);
        // The amount input should be disabled because token_decimalized_qty is specified in the BIP21 string
        expect(amountInputEl).toBeDisabled();

        // We do not see a token ID query error
        expect(
            screen.queryByText(`Error querying token info for ${token_id}`),
        ).not.toBeInTheDocument();

        // We see the valid firma redeem tx info
        expect(screen.getByAltText('Firma Alpha reward')).toBeInTheDocument();
        expect(screen.getByAltText('USDC logo')).toBeInTheDocument();

        await waitFor(() => {
            expect(
                screen.getByText(
                    'On tx finalized, 5.0000 USDC will be sent to 6JK...EQ4',
                ),
            ).toBeInTheDocument();
        });

        // Wait for the send button to be enabled
        await waitFor(() => {
            const sendButton = screen.getByRole('button', { name: 'Send' });
            expect(sendButton).toBeEnabled();
        });

        // We DO NOT see the standard parsed firma field for a valid firma redeem action
        expect(screen.queryByText('Parsed firma')).not.toBeInTheDocument();
        expect(screen.queryByText('Solana Address')).not.toBeInTheDocument();

        // We can send the tx
        const sendButton = screen.getByRole('button', { name: 'Send' });
        await user.click(sendButton);

        // We see the notification for a successful tx broadcast
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('ALP Fungible: EMPP switches are visible and cashtab msg validation works', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Token send tx with cashtab msg EMPP push
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441cf2acd293f51d1c0927b05d3105a5e705d31a4a2a0c00345fadcddc4f566067d36c6386d49186ebfb3459cf8bdadd23d3a28698b788baf58613570c1b023f5444121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441fa5c099b9721ea21b4e282a34ba877952b68969893a2e7a34fd2d2a990327ab7f1f93c419950f722e579570e8aa1a33f7fde77cf0329ca3ffb334cebbb0af4094121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000a46a5037534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c02102700000000301b0f0000004c68007461626161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac80320f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '7b975fb8d2fb544baf423a3d75856f3cb33e6153bff0686c1b2ae698ad95c931';
        mockedChronik.setBroadcastTx(hex, txid);

        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(alpMocks.tokenId, alpMocks.token);
        mockedChronik.setTx(alpMocks.tokenId, alpMocks.tx);

        const { tokenTicker } = alpMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Switch to token mode via Send Token link
        const sendTokenLink = await screen.findByRole('link', {
            name: /Send Token/i,
        });
        expect(sendTokenLink).toBeInTheDocument();
        await user.click(sendTokenLink);

        // Wait for token mode UI to appear
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText('Search by token ticker or name'),
            ).toBeInTheDocument();
        });

        // Search for the token by ticker
        const tokenSearchInput = screen.getByPlaceholderText(
            'Search by token ticker or name',
        );
        await user.type(tokenSearchInput, tokenTicker);

        // Wait for dropdown to appear with token
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });

        // Click on the token in the dropdown to select it
        const tokenTickerElement = screen.getByText(tokenTicker);
        await user.click(tokenTickerElement.closest('div'));

        // Wait for token to be selected and address/amount inputs to appear
        await waitFor(() => {
            const addressInput =
                screen.queryByPlaceholderText('Address or contact');
            expect(addressInput).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: /Advanced/i }));

        // Verify EMPP switches are visible for ALP tokens (inside Advanced)
        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Cashtab Msg' }),
            ).toBeInTheDocument();
            expect(
                screen.getByRole('button', { name: 'empp_raw' }),
            ).toBeInTheDocument();
        });

        // Enter address
        const addressInputEl =
            screen.getByPlaceholderText('Address or contact');
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, address);
        expect(addressInputEl).toHaveValue(address);

        // Enter amount
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const token_decimalized_qty = '1';
        await user.type(amountInputEl, token_decimalized_qty);
        expect(amountInputEl).toHaveValue(token_decimalized_qty);

        // Enable Cashtab Msg switch
        const cashtabMsgButton = screen.getByRole('button', {
            name: 'Cashtab Msg',
        });
        await user.click(cashtabMsgButton);

        // Wait for cashtab msg textarea to appear
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText(
                    /Include a Cashtab msg EMPP push with this token tx/,
                ),
            ).toBeInTheDocument();
        });

        // Type 101 characters (exceeds 100 byte limit including lokad)
        const cashtabMsgInput = screen.getByPlaceholderText(
            /Include a Cashtab msg EMPP push with this token tx/,
        );
        const longMessage = 'a'.repeat(101);
        await user.type(cashtabMsgInput, longMessage);

        // Verify validation error appears and send button is disabled
        await waitFor(() => {
            expect(
                screen.getByText(/Message can not exceed 100 bytes/),
            ).toBeInTheDocument();
        });

        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeDisabled();

        await user.clear(cashtabMsgInput);

        // Remove a byte so we are at 100 bytes, incl lokad
        const okMsg = 'a'.repeat(100);
        await user.type(cashtabMsgInput, okMsg);

        // Verify validation error is gone and send button is enabled
        await waitFor(() => {
            expect(
                screen.queryByText(/Message can not exceed 100 bytes/),
            ).not.toBeInTheDocument();
        });

        expect(sendButton).toBeEnabled();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );

        // TokenId should remain selected after send
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });
    });
    it('ALP Fungible: We can send an ALP token with empp_raw', async () => {
        // Mock the app with context at the Send screen
        const mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY,
        });

        // Token send tx with empp_raw EMPP push
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf79261803000000644189f4931b1f7ecfdaf3990c4aa2e4eb053512af8a9c0610b5520edafdba584d4cfb04db7e8aa882a38dd80b8d94d153d7eac2d0587632a938c100606ff3b1a0cc4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c2501000000644118f73e87e442ffa404a35a841300f60a4033c8eda06d1622a32d417417f0f4f40003dc89313b82db2c2d5ee4e3172ad497f2c2c9dc21c8a51a1b430e7e454a664121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0400000000000000003f6a5037534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c02102700000000301b0f00000004deadbeef22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac0e310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '2968b6307fc36f3c09b421948ab6f90278b2b7f727a6a92c3d95c6b23c40e42c';
        mockedChronik.setBroadcastTx(hex, txid);

        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setToken(alpMocks.tokenId, alpMocks.token);
        mockedChronik.setTx(alpMocks.tokenId, alpMocks.tx);

        const { tokenTicker } = alpMocks.token.genesisInfo;

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Wait for the app to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Switch to token mode via Send Token link
        const sendTokenLink = await screen.findByRole('link', {
            name: /Send Token/i,
        });
        expect(sendTokenLink).toBeInTheDocument();
        await user.click(sendTokenLink);

        // Wait for token mode UI to appear
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText('Search by token ticker or name'),
            ).toBeInTheDocument();
        });

        // Search for the token by ticker
        const tokenSearchInput = screen.getByPlaceholderText(
            'Search by token ticker or name',
        );
        await user.type(tokenSearchInput, tokenTicker);

        // Wait for dropdown to appear with token
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });

        // Click on the token in the dropdown to select it
        const tokenTickerElement = screen.getByText(tokenTicker);
        await user.click(tokenTickerElement.closest('div'));

        // Wait for token to be selected and address/amount inputs to appear
        await waitFor(() => {
            const addressInput =
                screen.queryByPlaceholderText('Address or contact');
            expect(addressInput).toBeInTheDocument();
        });

        // Enter address
        const addressInputEl =
            screen.getByPlaceholderText('Address or contact');
        const address = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, address);
        expect(addressInputEl).toHaveValue(address);

        // Enter amount
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const token_decimalized_qty = '1';
        await user.type(amountInputEl, token_decimalized_qty);
        expect(amountInputEl).toHaveValue(token_decimalized_qty);

        await user.click(screen.getByRole('button', { name: /Advanced/i }));

        // Enable empp_raw switch
        const emppRawButton = screen.getByRole('button', {
            name: 'empp_raw',
        });
        await user.click(emppRawButton);

        // Wait for empp_raw textarea to appear
        await waitFor(() => {
            expect(
                screen.getByPlaceholderText(/Enter raw hex EMPP push/),
            ).toBeInTheDocument();
        });

        // Type "deadbeef" in empp_raw field
        const emppRawInput = screen.getByPlaceholderText(
            /Enter raw hex EMPP push/,
        );
        const emppRawValue = 'deadbeef';
        await user.type(emppRawInput, emppRawValue);
        expect(emppRawInput).toHaveValue(emppRawValue);

        // We see the parsed empp_raw
        expect(screen.getByText('Parsed empp_raw')).toBeInTheDocument();
        expect(screen.getByText('Unknown Protocol')).toBeInTheDocument();

        // The send button should be enabled
        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();

        // Click Send
        await user.click(sendButton);

        // Notification is rendered with expected txid
        const txSuccessNotification = await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(txSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );

        // TokenId should remain selected after send
        await waitFor(() => {
            expect(screen.getByText(tokenTicker)).toBeInTheDocument();
        });
    });
    it('SLP CACHET: Token send to many — 25 recipients (form workflow)', async () => {
        const cachetWallet = {
            ...tokenTestWallet,
            state: {
                ...tokenTestWallet.state,
                slpUtxos: [
                    ...tokenTestWallet.state.slpUtxos,
                    {
                        outpoint: {
                            txid: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            outIdx: 2,
                        },
                        blockHeight: 838200,
                        isCoinbase: false,
                        isFinal: true,
                        sats: 546n,
                        token: {
                            tokenId: slp1FixedCachet.tokenId,
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            atoms: 10000000n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokens: new Map([
                    ...Array.from(tokenTestWallet.state.tokens.entries()),
                    [slp1FixedCachet.tokenId, '100000'],
                ]),
            },
        };

        const mockedChronik = await initializeCashtabStateForTests(
            cachetWallet,
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

        mockedChronik.setToken(slp1FixedCachet.tokenId, slp1FixedCachet.token);
        mockedChronik.setTx(slp1FixedCachet.tokenId, slp1FixedCachet.tx);

        const addrA = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
        const addrB = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const tokenMultiLines = Array.from(
            { length: 25 },
            (_, i) => `${i % 2 === 0 ? addrA : addrB},0.01`,
        ).join('\n');

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        // Prep mock chronik client with expected tx chain
        const firstTx =
            '0200000002b13c550e03a38750239191f649760d70b95c13de2e25c0884b93961ba361d8ae0200000064412fa83a70087fbf9e0efa08161255270aec2f1501de8b0391557e0752755b6256e7ed8371178688d77f0191f955ab281de14f3260c1fd8b0048d9cf738f20a8ea4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441bc4f378d7c80e96acf58ee765101963c1329c252a7247df67ec000d94b0d931b98297d0138109ff618c940e695566e064bcb9005b61d16113299679b839e22ec4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff150000000000000000d96a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000098966e22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac62150000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188accdf30e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const firstTxid =
            '5a91a5c598a9b85621d364ce91a62adf6bcb1ec672fa2eab148923de10ed85e5';
        const secondTx =
            '0200000001e585ed10de238914ab2efa72c61ecb6bdf2aa691ce64d32156b8a998c5a5915a130000006441f96d7573ca7ffac1351fb37fd7433453fa6cf81a27babd2f8fd4728a169efc8632894d4382d9cd449ff01817d72cf1e11a0400b4155373c054f0d5d02d983bb14121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff090000000000000000766a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000098966722020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const secondTxid =
            'd70e0f559347395152e3b888130591d6d913ff9d93ea935de802490e4f9762bd';
        mockedChronik.setBroadcastTx(firstTx, firstTxid);
        mockedChronik.setBroadcastTx(secondTx, secondTxid);

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        await user.click(
            await screen.findByRole('link', { name: /Send Token/i }),
        );

        await screen.findByPlaceholderText('Search by token ticker or name');
        await user.type(
            screen.getByPlaceholderText('Search by token ticker or name'),
            'CACHET',
        );
        await waitFor(() => {
            expect(screen.getByText('CACHET')).toBeInTheDocument();
        });
        await user.click(screen.getByText('CACHET').closest('div'));

        await screen.findByPlaceholderText('Address or contact');
        await user.click(screen.getByRole('button', { name: /Advanced/i }));
        await user.click(screen.getByRole('button', { name: 'Send to many' }));

        const multiEl = screen.getByPlaceholderText(
            /One address & token qty per line/,
        );
        fireEvent.input(multiEl, { target: { value: tokenMultiLines } });
        fireEvent.change(multiEl, { target: { value: tokenMultiLines } });
        expect(multiEl).toHaveValue(tokenMultiLines);

        await user.click(screen.getByRole('button', { name: 'Send' }));

        const txSuccessNotification = await screen.findByText('eToken sent');
        expect(txSuccessNotification).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${firstTxid}`,
        );
    });
    it('SLP CACHET: Token send to many — valid bip21 input renders and sends chained tx', async () => {
        const cachetWallet = {
            ...tokenTestWallet,
            state: {
                ...tokenTestWallet.state,
                slpUtxos: [
                    ...tokenTestWallet.state.slpUtxos,
                    {
                        outpoint: {
                            txid: 'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                            outIdx: 2,
                        },
                        blockHeight: 838200,
                        isCoinbase: false,
                        isFinal: true,
                        sats: 546n,
                        token: {
                            tokenId: slp1FixedCachet.tokenId,
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            atoms: 10000000n,
                            isMintBaton: false,
                        },
                    },
                ],
                tokens: new Map([
                    ...Array.from(tokenTestWallet.state.tokens.entries()),
                    [slp1FixedCachet.tokenId, '100000'],
                ]),
            },
        };

        const mockedChronik = await initializeCashtabStateForTests(
            cachetWallet,
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

        mockedChronik.setToken(slp1FixedCachet.tokenId, slp1FixedCachet.token);
        mockedChronik.setTx(slp1FixedCachet.tokenId, slp1FixedCachet.tx);

        const addrA = 'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035';
        const addrB = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const bip21Query = [
            `token_id=${slp1FixedCachet.tokenId}`,
            'token_decimalized_qty=0.01',
            ...Array.from(
                { length: 24 },
                (_, i) =>
                    `addr=${i % 2 === 0 ? addrB : addrA}&token_decimalized_qty=0.01`,
            ),
        ].join('&');
        const bip21Input = `${addrA}?${bip21Query}`;

        // Prep mock chronik client with expected tx chain
        const firstTx =
            '0200000002b13c550e03a38750239191f649760d70b95c13de2e25c0884b93961ba361d8ae0200000064412fa83a70087fbf9e0efa08161255270aec2f1501de8b0391557e0752755b6256e7ed8371178688d77f0191f955ab281de14f3260c1fd8b0048d9cf738f20a8ea4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441bc4f378d7c80e96acf58ee765101963c1329c252a7247df67ec000d94b0d931b98297d0138109ff618c940e695566e064bcb9005b61d16113299679b839e22ec4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff150000000000000000d96a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000098966e22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac62150000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188accdf30e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const firstTxid =
            '5a91a5c598a9b85621d364ce91a62adf6bcb1ec672fa2eab148923de10ed85e5';
        const secondTx =
            '0200000001e585ed10de238914ab2efa72c61ecb6bdf2aa691ce64d32156b8a998c5a5915a130000006441f96d7573ca7ffac1351fb37fd7433453fa6cf81a27babd2f8fd4728a169efc8632894d4382d9cd449ff01817d72cf1e11a0400b4155373c054f0d5d02d983bb14121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff090000000000000000766a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000098966722020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const secondTxid =
            'd70e0f559347395152e3b888130591d6d913ff9d93ea935de802490e4f9762bd';
        mockedChronik.setBroadcastTx(firstTx, firstTxid);
        mockedChronik.setBroadcastTx(secondTx, secondTxid);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route="/send"
            />,
        );

        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        const addressInputEl = await getRecipientInput();
        fireEvent.input(addressInputEl, { target: { value: bip21Input } });
        fireEvent.change(addressInputEl, { target: { value: bip21Input } });

        await waitFor(() => {
            expect(
                screen.getByText('BIP21: Sending 0.25 CACHET to 25 outputs'),
            ).toBeInTheDocument();
        });

        const multiEl = await screen.findByPlaceholderText(
            /One address & token qty per line/,
        );
        expect(multiEl).toHaveProperty('disabled', true);
        expect(multiEl).toHaveValue(
            `${addrA},0.01\n${Array.from(
                { length: 24 },
                (_, i) => `${i % 2 === 0 ? addrB : addrA},0.01`,
            ).join('\n')}`,
        );

        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeEnabled();
        await user.click(sendButton);

        const txSuccessNotification = await screen.findByText('eToken sent');
        expect(txSuccessNotification).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${firstTxid}`,
        );
    });
});
