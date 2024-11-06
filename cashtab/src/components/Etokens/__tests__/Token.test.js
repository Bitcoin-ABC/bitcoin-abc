// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { when } from 'jest-when';
import aliasSettings from 'config/alias';
import { explorer } from 'config/explorer';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import appConfig from 'config/app';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { walletWithXecAndTokens } from 'components/App/fixtures/mocks';
import {
    slp1FixedBear,
    slp1FixedCachet,
} from 'components/Etokens/fixtures/mocks';
import { Ecc, initWasm } from 'ecash-lib';
import { MockAgora } from '../../../../../modules/mock-chronik-client';
import { token as tokenConfig } from 'config/token';

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

describe('<Token />', () => {
    let ecc;
    beforeAll(async () => {
        await initWasm();
        ecc = new Ecc();
    });
    let user, mockedChronik;
    beforeEach(async () => {
        // Mock the app with context at the Send screen
        mockedChronik = await initializeCashtabStateForTests(
            walletWithXecAndTokens,
            localforage,
        );
        // Set chronik mocks required for cache preparation and supply calc
        mockedChronik.setMock('token', {
            input: slp1FixedBear.tokenId,
            output: slp1FixedBear.token,
        });
        mockedChronik.setMock('tx', {
            input: slp1FixedBear.tokenId,
            output: slp1FixedBear.tx,
        });
        mockedChronik.setTokenId(slp1FixedBear.tokenId);
        mockedChronik.setUtxosByTokenId(slp1FixedBear.tokenId, {
            tokenId: slp1FixedBear.tokenId,
            utxos: slp1FixedBear.utxos,
        });

        // Set up userEvent
        user = userEvent.setup();
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

    it('For a fungible SLP token, renders the Token screen with sale by default and expected inputs', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByTokenId(SEND_TOKEN_TOKENID, []);

        // Mock not blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${SEND_TOKEN_TOKENID}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: false }),
            });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        const totalQtyInput = screen.getByPlaceholderText('Offered qty');
        const minQtyInput = screen.getByPlaceholderText('Min buy');

        // Input fields are rendered
        expect(totalQtyInput).toBeInTheDocument();
        expect(minQtyInput).toBeInTheDocument();

        // Qty inputs are not disabled
        expect(totalQtyInput).toHaveProperty('disabled', false);
        expect(minQtyInput).toHaveProperty('disabled', false);

        // Price input is disabled as qty inputs are at 0 value
        expect(
            screen.getByPlaceholderText('Enter SLP list price (per token)'),
        ).toHaveProperty('disabled', true);

        // List button is present and disabled
        expect(
            screen.getByRole('button', { name: /List BearNip/ }),
        ).toHaveProperty('disabled', true);

        // OrderBook is rendered
        // NB OrderBook behavior is tested independently, we only test that it appears as expected here
        expect(
            await screen.findByText('No active offers for this token'),
        ).toBeInTheDocument();
    });
    it('We show an alert and do not render the Orderbook for a blacklisted token', async () => {
        // Need to mock agora API endpoints
        const mockedAgora = new MockAgora();

        // No active offers
        mockedAgora.setActiveOffersByTokenId(SEND_TOKEN_TOKENID, []);

        // Mock blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${SEND_TOKEN_TOKENID}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: true }),
            });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        const totalQtyInput = screen.getByPlaceholderText('Offered qty');
        const minQtyInput = screen.getByPlaceholderText('Min buy');

        // Input fields are rendered
        expect(totalQtyInput).toBeInTheDocument();
        expect(minQtyInput).toBeInTheDocument();

        // Qty inputs are not disabled
        expect(totalQtyInput).toHaveProperty('disabled', false);
        expect(minQtyInput).toHaveProperty('disabled', false);

        // Price input is disabled as qty inputs are at 0 value
        expect(
            screen.getByPlaceholderText('Enter SLP list price (per token)'),
        ).toHaveProperty('disabled', true);

        // List button is present and disabled
        expect(
            screen.getByRole('button', { name: /List BearNip/ }),
        ).toHaveProperty('disabled', true);

        // OrderBook is NOT rendered
        // We show expected blacklist notice
        expect(
            await screen.findByText(
                'Cashtab does not support trading this token',
            ),
        ).toBeInTheDocument();
    });
    it('Accepts a valid ecash: prefixed address', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // Click Send
        await user.click(await screen.findByTitle('Toggle Send'));

        const addressInputEl = screen.getByPlaceholderText(/Address/);

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
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // Click Send
        await user.click(await screen.findByTitle('Toggle Send'));

        const addressInputEl = screen.getByPlaceholderText(/Address/);

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
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // Click Send
        await user.click(await screen.findByTitle('Toggle Send'));

        const addressInputEl = screen.getByPlaceholderText(/Address/);

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
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // Click Send
        await user.click(await screen.findByTitle('Toggle Send'));

        const addressInputEl = screen.getByPlaceholderText(/Address/);

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
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // Click Send
        await user.click(await screen.findByTitle('Toggle Send'));

        const addressInputEl = screen.getByPlaceholderText(/Address/);

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
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // Click Send
        await user.click(await screen.findByTitle('Toggle Send'));

        const addressInputEl = screen.getByPlaceholderText(/Address/);

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
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // Click Send
        await user.click(await screen.findByTitle('Toggle Send'));

        const addressInputEl = screen.getByPlaceholderText(/Address/);

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
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // Click Send
        await user.click(await screen.findByTitle('Toggle Send'));

        const addressInputEl = screen.getByPlaceholderText(/Address/);

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
            '02000000023023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b010000006441bac61dbfa47bc7b92952caaa867c2c5fd11bde4cfa36c21b818dbb80c15b19a0c94845e916bc57bc5f35f32ca379bd48a6ee1dc4ded52794bcee231655b105f14121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441a59dcc96f885dcbf56d473ba74b3202adb00dbc1142e379efa3784b559d7be97aa3d777eb4001613f205191d177c9896f652132d397a65cdfa93c69657d59f1b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10908000000000000000122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acbb800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '6de2d27d40bced679a8b8e55c85230ed8da0977c30ad31247fefc0b1eba0976e';

        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // Click Send
        await user.click(await screen.findByTitle('Toggle Send'));

        // The user enters a valid address and send amount
        const addressInputEl = screen.getByPlaceholderText(/Address/);
        const addressInput = 'ecash:qp89xgjhcqdnzzemts0aj378nfe2mhu9yvxj9nhgg6';
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const amountInput = '1';
        await user.type(addressInputEl, addressInput);
        await user.type(amountInputEl, amountInput);

        // Click the Send token button
        await user.click(screen.getByRole('button', { name: /Send BEAR/ }));

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
            '02000000023023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b0100000064416e015895372b0c7af66e744e54c05fac76fad69179763cb2feb35472e77017ebd223f9b3b1c12a9cb2e63570a967a3ee7db8b46ad6820a24cebcf41523d01c1a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441cc7b1ea349953692258fd581b8fc4061a324ac7893586dcbbbb4ef41a32beb142d6e28c06304b99ad7a0c6fde5c55a9b98cdb74be34c65d5631d2a5c5921ce9a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10908000000000000000022020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188acbb800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'f3023fd2265ed98438f5d4d01d31a1d94633b496e03d4aad5acd8da240e38736';

        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // The sell switch is turned on by default
        expect(screen.getByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // The send switch is present
        expect(screen.getByTitle('Toggle Send')).toBeInTheDocument();

        // Click the burn switch to show the burn interface
        await user.click(screen.getByTitle('Toggle Burn'));

        // The burn switch is turned on
        expect(screen.getByTitle('Toggle Burn')).toHaveProperty(
            'checked',
            true,
        );
        // Confirm that turning Burn on turns all other switches off
        expect(screen.getByTitle('Toggle Send')).toHaveProperty(
            'checked',
            false,
        );
        expect(screen.getByTitle('Toggle Airdrop')).toHaveProperty(
            'checked',
            false,
        );

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
                ecc={ecc}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // The mint switch is not rendered
        expect(screen.queryByTitle('Toggle Mint')).not.toBeInTheDocument();
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
            input: slp1FixedCachet.tokenId,
            output: slp1FixedCachet.token,
        });
        mintMockedChronik.setMock('tx', {
            input: slp1FixedCachet.tokenId,
            output: slp1FixedCachet.tx,
        });
        mockedChronik.setTokenId(slp1FixedCachet.tokenId);
        mockedChronik.setUtxosByTokenId(slp1FixedCachet.tokenId, {
            tokenId: slp1FixedCachet.tokenId,
            utxos: slp1FixedCachet.utxos,
        });

        const hex =
            '02000000028ec326590f3e42afae0e458995599c4c892af8e749efc7cc6bcfca8b0f2a5b4b020000006441672ba8ac8941cc69b6f49f80da73046e65a125376dc0311b5467d678350924d598d5750cd2c19dd8b42016cef9629969373336ce2eb50c1d741985a652449db44121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441dfb3546c5e588030696f1e4a1ef00d039743514be0304505415ad9de4cf4ea0b4e9d0fda1ba3869241825e269867f6a45251477057a68ba39883eb4d25008cd64121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000396a04534c50000101044d494e5420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1010208000000000000273122020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac517e0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '567114b4adbb5e8969a587ac58866c0ccf0c91ded1fd0d96d75f8cb7aeb6f33a';

        mintMockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mintMockedChronik}
                ecc={ecc}
                route={`/token/${mockTokenId}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/CACHET/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell SLP')).toHaveProperty(
            'checked',
            true,
        );

        // The mint switch is rendered
        const mintSwitch = screen.getByTitle('Toggle Mint');
        expect(mintSwitch).toBeInTheDocument();

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
    it('For an uncached token with no balance, we show a spinner while loading the token info, then show an info screen and open agora offers', async () => {
        // Set mock tokeninfo call
        const CACHET_TOKENID = slp1FixedCachet.tokenId;
        mockedChronik.setMock('token', {
            input: CACHET_TOKENID,
            output: slp1FixedCachet.token,
        });
        mockedChronik.setMock('tx', {
            input: CACHET_TOKENID,
            output: slp1FixedCachet.tx,
        });
        mockedChronik.setTokenId(CACHET_TOKENID);
        mockedChronik.setUtxosByTokenId(CACHET_TOKENID, {
            tokenId: slp1FixedCachet.tokenId,
            utxos: slp1FixedCachet.utxos,
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route={`/token/${CACHET_TOKENID}`}
            />,
        );

        // Wait for Cashtab wallet info to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We see a spinner while token info is loading
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // Cashtab pings chronik to build token cache info and displays token summary table
        expect((await screen.findAllByText(/CACHET/))[0]).toBeInTheDocument();

        // We see the token supply
        expect(screen.getByText('Supply:')).toBeInTheDocument();
        expect(
            await screen.findByText('29,999,987,980,000,000.00 (fixed)'),
        ).toBeInTheDocument();

        // We see a notice that we do not hold this token
        expect(
            screen.getByText('You do not hold this token.'),
        ).toBeInTheDocument();

        // We do not see token actions
        expect(screen.queryByTitle('Token Actions')).not.toBeInTheDocument();
    });
    it('For an uncached token with no balance, we show a chronik query error if we are unable to fetch the token info', async () => {
        // Set mock tokeninfo call
        const CACHET_TOKENID = slp1FixedCachet.tokenId;
        mockedChronik.setMock('token', {
            input: CACHET_TOKENID,
            output: new Error('some error'),
        });
        mockedChronik.setMock('tx', {
            input: CACHET_TOKENID,
            output: new Error('some error'),
        });
        mockedChronik.setTokenId(CACHET_TOKENID);
        mockedChronik.setUtxosByTokenId(CACHET_TOKENID, {
            tokenId: slp1FixedCachet.tokenId,
            utxos: new Error('some error'),
        });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route={`/token/${CACHET_TOKENID}`}
            />,
        );

        // Wait for Cashtab wallet info to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We see a spinner while token info is loading
        expect(screen.getByTitle('Loading')).toBeInTheDocument();

        // We see expected chronik query error
        expect(
            await screen.findByText(
                'Error querying token info. Please try again later.',
            ),
        ).toBeInTheDocument();

        // We see a notice that we do not hold this token
        expect(
            screen.getByText('You do not hold this token.'),
        ).toBeInTheDocument();

        // We do not see token actions
        expect(screen.queryByTitle('Token Actions')).not.toBeInTheDocument();
    });
    it('For an invalid tokenId, we do not query chronik, and we show an invalid tokenId notice', async () => {
        const invalidTokenId = '012345';
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                route={`/token/${invalidTokenId}`}
            />,
        );

        // Wait for Cashtab wallet info to load
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // We never see a spinner as we never make a chronik token info call
        expect(screen.queryByTitle('Loading')).not.toBeInTheDocument();

        // We see expected invalid tokenId error
        expect(
            await screen.findByText(`Invalid tokenId ${invalidTokenId}`),
        ).toBeInTheDocument();

        // We DO NOT see a notice that we do not hold this token
        expect(
            screen.queryByText('You do not hold this token.'),
        ).not.toBeInTheDocument();

        // We do not see token actions
        expect(screen.queryByTitle('Token Actions')).not.toBeInTheDocument();
    });
});
