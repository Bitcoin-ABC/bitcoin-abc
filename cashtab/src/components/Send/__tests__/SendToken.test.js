// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent, {
    PointerEventsCheckLevel,
} from '@testing-library/user-event';
import { when } from 'jest-when';
import aliasSettings from 'config/alias';
import { explorer } from 'config/explorer';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/fixtures/helpers';
import CashtabTestWrapper from 'components/fixtures/CashtabTestWrapper';
import appConfig from 'config/app';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { walletWithXecAndTokens } from 'components/fixtures/mocks';

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

const SEND_TOKEN_TOKENID =
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109';
const SEND_TOKEN_DECIMALS = 0;
const SEND_TOKEN_TICKER = 'BEAR';
const SEND_TOKEN_BALANCE =
    walletWithXecAndTokens.state.tokens.get(SEND_TOKEN_TOKENID);

// See src/validation, ref parseAddressInput
// See SendToken for some modified errors (SendToken does not support bip21)
// These could change, which would break tests, which is expected behavior if we haven't
// updated tests properly on changing the app
const SEND_ADDRESS_VALIDATION_ERRORS_TOKEN = [
    `Aliases must end with '.xec'`,
    'eCash Alias does not exist or yet to receive 1 confirmation',
    'Invalid address',
    'eToken sends do not support bip21 query strings',
];
const SEND_AMOUNT_VALIDATION_ERRORS_TOKEN = [
    `Amount must be a number`,
    'Amount must be greater than 0',
    `Amount cannot exceed your ${SEND_TOKEN_TICKER} balance of ${SEND_TOKEN_BALANCE}`,
    `This token only supports ${SEND_TOKEN_DECIMALS} decimal places`,
];

describe('<SendToken />', () => {
    let user, mockedChronik;
    beforeEach(async () => {
        // Mock the app with context at the Send screen
        mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        // Set mock tokeninfo call
        mockedChronik.setMock('token', {
            input: '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
            output: {
                genesisInfo: {
                    tokenTicker: 'BEAR',
                    tokenName: 'BearNip',
                    tokenDocumentUrl: 'https://cashtab.com/',
                    tokenDocumentHash: '',
                    decimals: 0,
                    tokenId:
                        '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
                },
            },
        });

        // Set up userEvent to skip pointerEvents check, which returns false positives with antd
        user = userEvent.setup({
            // https://github.com/testing-library/user-event/issues/922
            pointerEventsCheck: PointerEventsCheckLevel.Never,
        });
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

    it('Renders the SendToken screen with send address input', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');
        const amountInputEl = screen.getByPlaceholderText('Amount');

        // Input fields are rendered
        expect(addressInputEl).toBeInTheDocument();
        expect(amountInputEl).toBeInTheDocument();

        // Inputs are not disabled
        expect(addressInputEl).toHaveProperty('disabled', false);
        expect(amountInputEl).toHaveProperty('disabled', false);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS_TOKEN) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS_TOKEN) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }
    });
    it('Accepts a valid ecash: prefixed address', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');

        // The user enters a valid address
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS_TOKEN) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS_TOKEN) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }
    });
    it('Accepts a valid etoken: prefixed address', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');

        // The user enters a valid address
        const addressInput =
            'etoken:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvgvv3p0vd';
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS_TOKEN) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS_TOKEN) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }
    });
    it('Accepts a valid alias', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');

        const alias = 'twelvechar12';
        const expectedResolvedAddress =
            'ecash:qpmytrdsakt0axrrlswvaj069nat3p9s7cjctmjasj';

        // mock the fetch call to alias-server's '/alias' endpoint
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        alias: 'twelvechar12',
                        address: expectedResolvedAddress,
                        txid: '166b21d4631e2a6ec6110061f351c9c3bfb3a8d4e6919684df7e2824b42b0ffe',
                        blockheight: 792419,
                    }),
            });

        // The user enters a valid alias
        const addressInput = 'twelvechar12.xec';
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // No addr validation errors on load
        for (const addrErr of SEND_ADDRESS_VALIDATION_ERRORS_TOKEN) {
            expect(screen.queryByText(addrErr)).not.toBeInTheDocument();
        }
        // No amount validation errors on load
        for (const amountErr of SEND_AMOUNT_VALIDATION_ERRORS_TOKEN) {
            expect(screen.queryByText(amountErr)).not.toBeInTheDocument();
        }

        // The alias address preview renders the expected address preview
        expect(
            screen.getByText(
                `${expectedResolvedAddress.slice(
                    0,
                    10,
                )}...${expectedResolvedAddress.slice(-5)}`,
            ),
        ).toBeInTheDocument();
    });
    it('Displays a validation error for an invalid address', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');

        // The user enters an invalid address
        const addressInput = 'not a valid address';
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // We get the expected error
        expect(screen.getByText('Invalid address')).toBeInTheDocument();
    });
    it('Displays a validation error for an alias without .xec suffix', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');

        // The user enters a potentially valid alias without .xec suffix
        const addressInput = 'chicken';
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // We get the expected error
        expect(
            screen.getByText(`Aliases must end with '.xec'`),
        ).toBeInTheDocument();
    });
    it('Displays a validation error for valid alias that has not yet been registered', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');

        const alias = 'notregistered';

        // mock the fetch call to alias-server's '/alias' endpoint
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () =>
                    Promise.resolve({
                        alias: 'notregistered',
                        isRegistered: false,
                        pending: [],
                        registrationFeeSats: 551,
                        processedBlockheight: 827598,
                    }),
            });

        // The user enters a valid alias
        const addressInput = `${alias}.xec`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // We get the expected error
        expect(
            screen.getByText(
                `eCash Alias does not exist or yet to receive 1 confirmation`,
            ),
        ).toBeInTheDocument();
    });
    it('Displays expected error if alias server gives a bad response', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');

        const alias = 'servererror';

        // mock the fetch call to alias-server's '/alias' endpoint
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${alias}`;
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.reject(new Error('some error')),
            });

        // The user enters a valid alias
        const addressInput = `${alias}.xec`;
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // We get the expected error
        expect(
            screen.getByText(
                `Error resolving alias at indexer, contact admin.`,
            ),
        ).toBeInTheDocument();
    });
    it('Displays a validation error if the user includes any query string', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        const addressInputEl = screen.getByPlaceholderText('Address');

        // The user enters an ivalid address
        const addressInput =
            'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6?amount=5000';
        await user.type(addressInputEl, addressInput);

        // The 'Send To' input field has this address as a value
        expect(addressInputEl).toHaveValue(addressInput);

        // We get the expected error
        expect(
            screen.getByText('eToken sends do not support bip21 query strings'),
        ).toBeInTheDocument();
    });
    it('Renders the send token notification upon successful broadcast', async () => {
        const hex =
            '02000000023023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b010000006a47304402205b2a6c3258f95fed347fff3485f16e3507aa032c516c46f4631f769ac53af5aa02204b1940d9cdc79542dde8590743792cf07ced0d862f30a635af1c942754ae2e714121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006b483045022100ee46a0e31295eb96553d93beaddffac69b81392d400e5a23b172e150b7663dac02204cf681b845e66462689b8a9f5385a64517783085d342dc8ec40c16f08e0c1eee4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10908000000000000000122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388ac9f800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '6b3eb7d27be1cfd28efa206572b502aac60ef6be13fb10c521f003188b1afcce';

        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // The user enters a valid address and send amount
        const addressInputEl = screen.getByPlaceholderText('Address');
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const amountInput = '1';
        await user.type(addressInputEl, addressInput);
        await user.type(amountInputEl, amountInput);

        // Click the Send token button
        await user.click(screen.getByRole('button', { name: /Send/ }));

        const sendTokenSuccessNotification = await screen.findByText(
            'eToken sent',
        );
        await waitFor(() =>
            expect(sendTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('Renders the burn token success notification upon successful burn tx broadcast', async () => {
        const hex =
            '02000000023023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b010000006a4730440220510213513a45f1d02c38e524745db141a0c699e0abbd00552114beafebabe0ce02202d16daf42a61681e678744039067c23bca93e50a547fcb2a631547b34de225734121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006b483045022100a86446a3e27b0c80b7ca81070769d818758505933787b01076f99297faf7dd5e0220622cf7d02111e23d54f5ccd19606af1ab08c384c46e8ddeae74b55bc3b238ba04121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10908000000000000000022020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac9f800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '9fe2a278894fb4afc259ca455947b0f8864b74aa142294225f2fa818b68b1711';

        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Click the burn switch to show the burn interface
        await user.click(screen.getByTestId('burn-switch'));

        await user.type(screen.getByPlaceholderText('Burn Amount'), '1');

        // Click the Burn button
        // Note we button title is the token ticker
        await user.click(
            await screen.findByRole('button', { name: /Burn BEAR/ }),
        );

        // We see a modal and enter the correct confirmation msg
        await user.type(
            screen.getByPlaceholderText(`Type "burn BEAR" to confirm`),
            'burn BEAR',
        );

        // Click the Confirm button
        await user.click(screen.getByRole('button', { name: /OK/ }));

        const burnTokenSuccessNotification = await screen.findByText(
            '🔥 Burn successful',
        );
        await waitFor(() =>
            expect(burnTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('Mint switch is disabled if no mint batons for this token in the wallet', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                route={`/send-token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // The mint switch is disabled
        expect(screen.getByTestId('mint-switch')).toHaveProperty(
            'disabled',
            true,
        );

        expect(
            screen.getByText(/(disabled, no mint baton in wallet)/),
        ).toBeInTheDocument();
    });
    it('We can mint an slpv1 token if we have a mint baton', async () => {
        // Mock context with a mint baton utxo
        const mockTokenId =
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1';
        const mintBatonUtxo = {
            outpoint: {
                txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                outIdx: 2,
            },
            blockHeight: -1,
            isCoinbase: false,
            value: 546,
            isFinal: false,
            token: {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                amount: '0',
                isMintBaton: true,
            },
            path: 1899,
        };
        const balanceUtxo = {
            outpoint: {
                txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                outIdx: 2,
            },
            blockHeight: -1,
            isCoinbase: false,
            value: 546,
            isFinal: false,
            token: {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                amount: '20000',
                isMintBaton: false,
            },
            path: 1899,
        };
        const mintMockedChronik = await initializeCashtabStateForTests(
            {
                ...walletWithXecAndTokens,
                state: {
                    ...walletWithXecAndTokens.state,
                    slpUtxos: [
                        ...walletWithXecAndTokens.state.slpUtxos,
                        mintBatonUtxo,
                        balanceUtxo,
                    ],
                },
            },
            localforage,
        );
        // Set mock tokeninfo call
        mintMockedChronik.setMock('token', {
            input: mockTokenId,
            output: {
                genesisInfo: {
                    tokenTicker: 'CACHET',
                    tokenName: 'Cachet',
                    tokenDocumentUrl: 'https://cashtab.com/',
                    tokenDocumentHash: '',
                    decimals: 2,
                    tokenId: mockTokenId,
                },
            },
        });

        const hex =
            '02000000028ec326590f3e42afae0e458995599c4c892af8e749efc7cc6bcfca8b0f2a5b4b020000006b48304502210095c8181e677c6c6c88c3f0836129531944f88722f156bdeda4928342c5554ee702200addb9f7cc4678cd0d9f8111ab774936e92c893fce05fa783a58135f5a69ba614121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006a4730440220168f3738b988e690b2a45d818e69369376cde0e96524c5fe3ab5fdbefa89bffa0220777243d6b5d2c6d8929f95817633094c3f9b792e45ab8e095c763963fef099a74121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000396a04534c50000101044d494e5420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1010208000000000000273122020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac357e0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'dc12e6d3c5ea7504fdc51c8a713b952214b80ff27227faf2f970af74b9c8685e';

        mintMockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mintMockedChronik}
                route={`/send-token/${mockTokenId}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/CACHET/))[0]).toBeInTheDocument();

        // The mint switch is enabled
        const mintSwitch = screen.getByTestId('mint-switch');
        expect(mintSwitch).toHaveProperty('disabled', false);

        // Click the mint switch
        await user.click(mintSwitch);

        // Fill out the form
        await user.type(screen.getByPlaceholderText('Mint Amount'), '100.33');

        // Mint it
        await user.click(screen.getByRole('button', { name: /Mint CACHET/ }));

        const burnTokenSuccessNotification = await screen.findByText(
            '⚗️ Minted 100.33 CACHET',
        );
        await waitFor(() =>
            expect(burnTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
});
