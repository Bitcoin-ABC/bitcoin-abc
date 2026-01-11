// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { when } from 'jest-when';
import { explorer } from 'config/explorer';
import {
    walletWithXecAndTokensActive,
    bearTokenAndTx,
} from 'components/App/fixtures/mocks';
import { slp1FixedCachet } from 'components/Etokens/fixtures/mocks';
import { Ecc } from 'ecash-lib';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../../modules/mock-chronik-client';
import { token as tokenConfig } from 'config/token';
import { prepareContext, mockPrice } from 'test';
import { ThemeProvider } from 'styled-components';
import { theme } from 'assets/styles/theme';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from 'wallet/context';
import { ChronikClient, Utxo } from 'chronik-client';
import { Agora } from 'ecash-agora';
import App from 'components/App/App';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import { FEE_SATS_PER_KB_CASHTAB_LEGACY } from 'constants/transactions';
import { ActiveCashtabWallet } from 'wallet';

interface TokenTestWrapperProps {
    chronik: MockChronikClient;
    agora: MockAgora;
    ecc: Ecc;
    theme: any;
    route?: string;
}

const TokenTestWrapper: React.FC<TokenTestWrapperProps> = ({
    chronik,
    agora,
    ecc,
    theme,
    route = '/token/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109',
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

const SEND_TOKEN_TOKENID =
    '3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109';
const SEND_TOKEN_DECIMALS = 0;
const SEND_TOKEN_TICKER = 'BEAR';
const SEND_TOKEN_BALANCE =
    walletWithXecAndTokensActive.state.tokens.get(SEND_TOKEN_TOKENID);

// See src/validation, ref parseAddressInput
// See SendToken for some modified errors (SendToken does not support bip21)
// These could change, which would break tests, which is expected behavior if we haven't
// updated tests properly on changing the app
const SEND_ADDRESS_VALIDATION_ERRORS_TOKEN = [
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
    const ecc = new Ecc();
    let user: ReturnType<typeof userEvent.setup>;
    let mockedAgora: MockAgora;
    let mockedChronik: MockChronikClient;

    beforeEach(async () => {
        mockedAgora = new MockAgora();

        const tokenMocks = new Map();
        // Add BEAR token mock
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });
        tokenMocks.set(slp1FixedCachet.tokenId, {
            tx: slp1FixedCachet.tx,
            tokenInfo: slp1FixedCachet.token,
        });

        mockedChronik = await prepareContext(
            localforage,
            [walletWithXecAndTokensActive],
            tokenMocks,
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
        // Set up userEvent
        user = userEvent.setup();
        // Mock the fetch call for Cashtab's price API
        global.fetch = jest.fn();
        mockPrice(0.00003);
    });

    afterEach(async () => {
        jest.clearAllMocks();
        await localforage.clear();
    });

    it('For a fungible SLP token, renders the Token screen with sale by default and expected inputs', async () => {
        // No active offers
        mockedAgora.setActiveOffersByTokenId(SEND_TOKEN_TOKENID, []);

        // Mock not blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${SEND_TOKEN_TOKENID}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: false }),
            } as Response);

        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                theme={theme}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
            'checked',
            true,
        );

        const totalQtyInput = screen.getByPlaceholderText('Offered qty');
        const minQtyInput = screen.getByPlaceholderText('Min qty');

        // Input fields are rendered
        expect(totalQtyInput).toBeInTheDocument();
        expect(minQtyInput).toBeInTheDocument();

        // Only the total qty input is enabled
        expect(totalQtyInput).toBeEnabled();
        expect(minQtyInput).toBeDisabled();

        // Price input is disabled as qty inputs are at 0 value
        expect(
            screen.getByPlaceholderText('Enter list price (per token)'),
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
        // No active offers
        mockedAgora.setActiveOffersByTokenId(SEND_TOKEN_TOKENID, []);

        // Mock blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${SEND_TOKEN_TOKENID}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: true }),
            } as Response);

        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                theme={theme}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
            'checked',
            true,
        );

        const totalQtyInput = screen.getByPlaceholderText('Offered qty');
        const minQtyInput = screen.getByPlaceholderText('Min qty');

        // Input fields are rendered
        expect(totalQtyInput).toBeInTheDocument();
        expect(minQtyInput).toBeInTheDocument();

        // Only total qty input is enabled
        expect(totalQtyInput).toBeEnabled();
        expect(minQtyInput).toBeDisabled();

        // Price input is disabled as qty inputs are at 0 value
        expect(
            screen.getByPlaceholderText('Enter list price (per token)'),
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
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
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
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
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

    it('Displays a validation error for an invalid address', async () => {
        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
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

    it('Displays a validation error if the user includes any query string', async () => {
        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
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
            '0200000002fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441130d7c6c22a2d1e70a09c49914f2ccd069cf4875a587c925c2bb0e2667523a4041114b913046074ec38a75b3f6cebd4222c103161ade90a12950a8b6eac793404121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff3023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b010000006441857ca138d4a9c7c6799f40c07208f02dbee64f12d05eac847ea94bcc70653ab00847947bf6eba1613f558f5bd5ba5641f2326a8ffffacaf9e6091b478fecf3914121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001010453454e44203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10908000000000000000122020000000000001976a9144e532257c01b310b3b5c1fd947c79a72addf852388acbb800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '51a8563071344337682fff1c64219fd366e4fcc979d6a9853f612062e70eb0ca';

        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
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

        const sendTokenSuccessNotification =
            await screen.findByText('eToken sent');
        await waitFor(() =>
            expect(sendTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });

    it('Renders the burn token success notification upon successful burn tx broadcast (SLP BURN, no prep tx)', async () => {
        const hex =
            '02000000013023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b010000006441a53005abe517424feab9540a8fcbb0400aa484769767c8a4e6037687332fc72dd76e4ca95c741fa7a0965662cb8cf7e0974591df4f6aa5b30a4392eea4cf1f814121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff010000000000000000376a04534c50000101044255524e203fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10908000000000000000100000000';
        const txid =
            '2d042ca96e41a23007ec2060b7d55e758eedc03d0b7f700fc70874fb3fe5c37b';

        mockedChronik.setBroadcastTx(hex, txid);

        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // The sell switch is turned on by default
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
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

        const burnTokenSuccessNotification =
            await screen.findByText('🔥 Burn successful');
        await waitFor(() =>
            expect(burnTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });

    it('Renders the burn token success notification upon successful burn tx broadcast (SLP BURN with chained prep tx)', async () => {
        const CACHET_TOKEN_ID =
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1';
        // Prep tx hex (creates exact UTXO for burn)
        const prepTxHex =
            '0200000002fe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441f3e03685699f41008c64640d3eded6dec422a3a68671b89b2d40ee814ced447fab63e31cd7348fd79aa2b409cac0b3470ac29a4ac500c69e896b07b91ffa19dd4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff3b0760858b0b20ff50d0db67793892d29d2466b86a0116f7e232792da0c22330010000006441d1221abab6625a03c588cd0c55ca2669c2c58bcb2a799535e49a0c832c36b4b21d7226fe18e52b655c1b14d3190cd2b805b50538cd6038da13b86cd344a7d3684121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001010453454e4420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000138808000000000000138822020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac1b800e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const prepTxid =
            'bbf4d12597c64e228b9ae6fd79687d696ae16edd748baa4ca76c1907a28fa2a6';
        // Burn tx hex (burns the exact amount)
        const burnTxHex =
            '0200000001a6a28fa207196ca74caa8b74dd6ee16a697d6879fde69a8b224ec69725d1f4bb0100000064418daf8288477c538a57fbd4d1ec73e824cdc4d0c86fa2ae731941c0ec5bb462053bb2c718b38f7e92c0363893c8038c813c9881ee1302b555ef7fee316d799c7e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff010000000000000000376a04534c50000101044255524e20aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb108000000000000138800000000';
        const burnTxid =
            'e9139e80824de5fd5ba2234bd20da926fb974943109658fc6afcd7c7ca8a43b0';

        // Create a wallet with CACHET tokens that require chaining
        // We have 10000 atoms but want to burn 5000 (requires prep tx)
        const walletWithCachetForChainedBurn: ActiveCashtabWallet = {
            ...walletWithXecAndTokensActive,
            state: {
                ...walletWithXecAndTokensActive.state,
                slpUtxos: [
                    {
                        outpoint: {
                            txid: '3023c2a02d7932e2f716016ab866249dd292387967dbd050ff200b8b8560073b',
                            outIdx: 1,
                        },
                        blockHeight: -1,
                        isCoinbase: false,
                        sats: 546n,
                        isFinal: true,
                        token: {
                            tokenId: CACHET_TOKEN_ID,
                            tokenType: {
                                protocol: 'SLP',
                                type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                number: 1,
                            },
                            atoms: 10000n, // Have 10000 atoms
                            isMintBaton: false,
                        },
                    },
                ],
                tokens: new Map([
                    [CACHET_TOKEN_ID, '100.00'], // 10000 atoms with 2 decimals = 100.00
                ]),
            },
        };

        // Add CACHET token mock
        const tokenMocks = new Map();
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });
        tokenMocks.set(slp1FixedCachet.tokenId, {
            tx: slp1FixedCachet.tx,
            tokenInfo: slp1FixedCachet.token,
        });

        mockedChronik = await prepareContext(
            localforage,
            [walletWithCachetForChainedBurn],
            tokenMocks,
        );

        // Mock both transactions in the chain (after creating mockedChronik)
        mockedChronik.setBroadcastTx(prepTxHex, prepTxid);
        mockedChronik.setBroadcastTx(burnTxHex, burnTxid);

        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${CACHET_TOKEN_ID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/CACHET/))[0]).toBeInTheDocument();

        // Click the burn switch to show the burn interface
        await user.click(screen.getByTitle('Toggle Burn'));

        // Enter burn amount of 50.00 (5000 atoms with 2 decimals)
        // This doesn't match our UTXO of 10000 atoms, so it requires a chained tx
        await user.type(screen.getByPlaceholderText('Burn Amount'), '50.00');

        // Click the Burn button
        await user.click(
            await screen.findByRole('button', { name: /Burn CACHET/ }),
        );

        // We see a modal and enter the correct confirmation msg
        await user.type(
            screen.getByPlaceholderText(`Type "burn CACHET" to confirm`),
            'burn CACHET',
        );

        // Click the Confirm button
        await user.click(screen.getByRole('button', { name: /OK/ }));

        const burnTokenSuccessNotification =
            await screen.findByText('🔥 Burn successful');
        // Verify we use the last txid (the actual burn tx, not the prep tx)
        await waitFor(() =>
            expect(burnTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${burnTxid}`,
            ),
        );
    });

    it('Mint switch is disabled if no mint batons for this token in the wallet', async () => {
        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${SEND_TOKEN_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/BEAR/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
            'checked',
            true,
        );

        // The mint switch is not rendered
        expect(screen.queryByTitle('Toggle Mint')).not.toBeInTheDocument();
    });

    it('We can mint an slpv1 token if we have a mint baton', async () => {
        // Mock context with a mint baton utxo
        const CACHET_TOKENID = slp1FixedCachet.tokenId;
        const mintBatonUtxo = {
            outpoint: {
                txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                outIdx: 2,
            },
            blockHeight: -1,
            isCoinbase: false,
            sats: 546n,
            isFinal: false,
            token: {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 0n,
                isMintBaton: true,
            },
        };
        const balanceUtxo = {
            outpoint: {
                txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                outIdx: 2,
            },
            blockHeight: -1,
            isCoinbase: false,
            sats: 546n,
            isFinal: false,
            token: {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenType: {
                    protocol: 'SLP',
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    number: 1,
                },
                atoms: 20000n,
                isMintBaton: false,
            },
        };
        // Test is for a different wallet, do not use the beforeEach mocks

        const tokenMocks = new Map();
        // Add BEAR token mock (from original wallet)
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });
        // Add CACHET token mock
        tokenMocks.set(CACHET_TOKENID, {
            tx: slp1FixedCachet.tx,
            tokenInfo: slp1FixedCachet.token,
        });

        const walletWithMintBaton = {
            ...walletWithXecAndTokensActive,
            state: {
                ...walletWithXecAndTokensActive.state,
                slpUtxos: [
                    ...walletWithXecAndTokensActive.state.slpUtxos,
                    mintBatonUtxo,
                    balanceUtxo,
                ],
            },
        };

        const mintMockedChronik = await prepareContext(
            localforage,
            [walletWithMintBaton] as unknown as ActiveCashtabWallet[],
            tokenMocks,
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

        mintMockedChronik.setUtxosByTokenId(
            CACHET_TOKENID,
            slp1FixedCachet.utxos as unknown as Utxo[],
        );

        const hex =
            '02000000028ec326590f3e42afae0e458995599c4c892af8e749efc7cc6bcfca8b0f2a5b4b020000006441672ba8ac8941cc69b6f49f80da73046e65a125376dc0311b5467d678350924d598d5750cd2c19dd8b42016cef9629969373336ce2eb50c1d741985a652449db44121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441dfb3546c5e588030696f1e4a1ef00d039743514be0304505415ad9de4cf4ea0b4e9d0fda1ba3869241825e269867f6a45251477057a68ba39883eb4d25008cd64121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000396a04534c50000101044d494e5420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1010208000000000000273122020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac517e0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '567114b4adbb5e8969a587ac58866c0ccf0c91ded1fd0d96d75f8cb7aeb6f33a';

        mintMockedChronik.setBroadcastTx(hex, txid);
        render(
            <TokenTestWrapper
                chronik={mintMockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                theme={theme}
                route={`/token/${CACHET_TOKENID}`}
            />,
        );

        // Wait for element to get token info and load
        expect((await screen.findAllByText(/CACHET/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
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

        const mintTokenSuccessNotification = await screen.findByText(
            '⚗️ Minted 100.33 CACHET',
        );
        await waitFor(() =>
            expect(mintTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });

    it('We can mint an slpv1 token if we have a mint baton and confirm modals enabled', async () => {
        // Mock context with a mint baton utxo
        const mintBatonUtxo = {
            outpoint: {
                txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                outIdx: 2,
            },
            blockHeight: -1,
            isCoinbase: false,
            sats: 546n,
            isFinal: false,
            token: {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenType: {
                    protocol: 'SLP' as const,
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE' as const,
                    number: 1,
                },
                atoms: 0n,
                isMintBaton: true,
            },
        };
        const balanceUtxo = {
            outpoint: {
                txid: '4b5b2a0f8bcacf6bccc7ef49e7f82a894c9c599589450eaeaf423e0f5926c38e',
                outIdx: 2,
            },
            blockHeight: -1,
            isCoinbase: false,
            sats: 546n,
            isFinal: false,
            token: {
                tokenId:
                    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1',
                tokenType: {
                    protocol: 'SLP' as const,
                    type: 'SLP_TOKEN_TYPE_FUNGIBLE' as const,
                    number: 1,
                },
                atoms: 20000n,
                isMintBaton: false,
            },
        };

        const walletWithMintBaton = {
            ...walletWithXecAndTokensActive,
            state: {
                ...walletWithXecAndTokensActive.state,
                slpUtxos: [
                    ...walletWithXecAndTokensActive.state.slpUtxos,
                    mintBatonUtxo,
                    balanceUtxo,
                ],
            },
        };

        // Test is for a different wallet, do not use the beforeEach mocks

        const tokenMocks = new Map();
        // Add BEAR token mock (from original wallet)
        tokenMocks.set(bearTokenAndTx.token.tokenId, {
            tx: bearTokenAndTx.tx,
            tokenInfo: bearTokenAndTx.token,
        });
        // Add CACHET token mock
        tokenMocks.set(slp1FixedCachet.tokenId, {
            tx: slp1FixedCachet.tx,
            tokenInfo: slp1FixedCachet.token,
        });

        const mintMockedChronik = await prepareContext(
            localforage,
            [walletWithMintBaton],
            tokenMocks,
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

        const hex =
            '02000000028ec326590f3e42afae0e458995599c4c892af8e749efc7cc6bcfca8b0f2a5b4b020000006441672ba8ac8941cc69b6f49f80da73046e65a125376dc0311b5467d678350924d598d5750cd2c19dd8b42016cef9629969373336ce2eb50c1d741985a652449db44121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dfffffffffe667fba52a1aa603a892126e492717eed3dad43bfea7365a7fdd08e051e8a21020000006441dfb3546c5e588030696f1e4a1ef00d039743514be0304505415ad9de4cf4ea0b4e9d0fda1ba3869241825e269867f6a45251477057a68ba39883eb4d25008cd64121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000396a04534c50000101044d494e5420aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1010208000000000000273122020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac517e0e00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '567114b4adbb5e8969a587ac58866c0ccf0c91ded1fd0d96d75f8cb7aeb6f33a';

        mintMockedChronik.setBroadcastTx(hex, txid);

        render(
            <TokenTestWrapper
                chronik={mintMockedChronik}
                ecc={ecc}
                agora={mockedAgora}
                theme={theme}
                route={`/`}
            />,
        );

        // Default route is home
        await screen.findByTestId('tx-history');

        // Click the hamburger menu
        const hamburgerMenu = screen.getByTitle('Show Other Screens');
        await user.click(hamburgerMenu);

        // Navigate to Settings screen
        await user.click(
            screen.getByRole('button', {
                name: /Settings/i,
            }),
        );

        // Now we see the Settings screen
        expect(screen.getByTitle('Settings')).toBeInTheDocument();

        // Send confirmations are disabled by default

        // Enable send confirmations
        await user.click(screen.getByTitle('Toggle Send Confirmations'));

        // Navigate to the Tokens screen
        await user.click(screen.getByText('Tokens'));
        // Navigate to the CACHET screen
        await user.click(screen.getByText('CACHET'));
        // Wait for element to get token info and load
        expect((await screen.findAllByText(/CACHET/))[0]).toBeInTheDocument();

        // Wait for Cashtab to recognize this is an SLP1 fungible token and enable Sale
        expect(await screen.findByTitle('Toggle Sell Token')).toHaveProperty(
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

        // Because send confirms are enabled, we see the Mint confirm modal
        expect(
            screen.getByText(`Are you sure you want to mint 100.33 CACHET?`),
        ).toBeInTheDocument();

        // We are sure
        await user.click(screen.getByText('OK'));

        const burnTokenSuccessNotification = await screen.findByText(
            '⚗️ Minted 100.33 CACHET',
        );
        await waitFor(() =>
            expect(burnTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );

        // The modal is gone
        expect(
            screen.queryByText(`Are you sure you want to mint 100.33 CACHET?`),
        ).not.toBeInTheDocument();
    });

    it('For an uncached token with no balance, we show a spinner while loading the token info, then show an info screen and open agora offers', async () => {
        const CACHET_TOKENID = slp1FixedCachet.tokenId;

        mockedChronik.setUtxosByTokenId(
            CACHET_TOKENID,
            slp1FixedCachet.utxos as unknown as Utxo[],
        );

        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${CACHET_TOKENID}`}
            />,
        );
        // Cashtab pings chronik to build token cache info and displays token summary table
        expect((await screen.findAllByText(/CACHET/))[0]).toBeInTheDocument();

        // We see the token supply
        expect(screen.getByText('Supply')).toBeInTheDocument();
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

        // Override the token mock to return an error
        mockedChronik.setToken(CACHET_TOKENID, new Error('some error'));
        mockedChronik.setTx(CACHET_TOKENID, new Error('some error'));
        mockedChronik.setUtxosByTokenId(
            CACHET_TOKENID,
            new Error('some error'),
        );

        render(
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${CACHET_TOKENID}`}
            />,
        );

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
            <TokenTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                theme={theme}
                route={`/token/${invalidTokenId}`}
            />,
        );

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
