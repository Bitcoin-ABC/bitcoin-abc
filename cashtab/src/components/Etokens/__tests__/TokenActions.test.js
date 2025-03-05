// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { when } from 'jest-when';
import {
    initializeCashtabStateForTests,
    clearLocalForage,
} from 'components/App/fixtures/helpers';
import CashtabTestWrapper from 'components/App/fixtures/CashtabTestWrapper';
import appConfig from 'config/app';
import 'fake-indexeddb/auto';
import localforage from 'localforage';
import {
    tokenTestWallet,
    supportedTokens,
    slp1FixedMocks,
    slp1VarMocks,
    alpMocks,
    slp1NftParentMocks,
    slp1NftParentWithChildrenMocks,
    slp1NftChildMocks,
} from 'components/Etokens/fixtures/mocks';
import {
    cachedHeismanNftOne,
    heismanNftOneOffer,
    heismanNftOneCache,
    heismanCollectionCacheMocks,
    tokenMockXecx,
} from 'components/Agora/fixtures/mocks';
import CashtabCache from 'config/CashtabCache';
import { cashtabCacheToJSON } from 'helpers';
import { Ecc } from 'ecash-lib';
import { MockAgora } from '../../../../../modules/mock-chronik-client';
import { Agora } from 'ecash-agora';
import { token as tokenConfig } from 'config/token';
import { explorer } from 'config/explorer';
import { FIRMA } from 'constants/tokens';

describe('<Token /> available actions rendered', () => {
    const ecc = new Ecc();
    let mockedChronik;
    // We need mockAgora now that we are using agora to subscribe to websockets
    let mockAgora;
    beforeEach(async () => {
        const mockedDate = new Date('2022-01-01T12:00:00.000Z');
        jest.spyOn(global, 'Date').mockImplementation(() => mockedDate);

        mockAgora = new MockAgora();

        // Mock the app with context at the Token Action screen
        mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Build chronik mocks that Cashtab would use to add token info to cache
        for (const tokenMock of supportedTokens) {
            mockedChronik.setToken(tokenMock.tokenId, tokenMock.token);
            mockedChronik.setTx(tokenMock.tokenId, tokenMock.tx);
            mockedChronik.setUtxosByTokenId(tokenMock.tokenId, tokenMock.utxos);
            // Set empty tx history to mock no existing NFTs
            mockedChronik.setTxHistoryByTokenId(tokenMock.tokenId, []);
        }

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
    it('SLP1 fixed supply token', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route={`/send-token/${slp1FixedMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1FixedMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `SLP 1 fungible token. Token may be of fixed supply if no mint batons exist. If you have a mint baton, you can mint more of this token at any time. May have up to 9 decimal places.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered as fixed
        expect(
            screen.getByText('2,999,998,798.000000000 (fixed)'),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // The sell switch is turned on by default
        expect(screen.getByTitle('Toggle Sell Token')).toHaveProperty(
            'checked',
            true,
        );

        // The send switch is present
        expect(screen.getByTitle('Toggle Send')).toBeInTheDocument();

        // The Airdrop switch is present
        expect(screen.getByTitle('Toggle Airdrop')).toBeInTheDocument();

        // The Burn switch is present
        expect(screen.getByTitle('Toggle Burn')).toBeInTheDocument();

        // The Mint switch is not rendered
        expect(screen.queryByTitle('Toggle Mint')).not.toBeInTheDocument();
    });
    it('SLP1 variable supply token with mint baton', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route={`/send-token/${slp1VarMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1VarMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `SLP 1 fungible token. Token may be of fixed supply if no mint batons exist. If you have a mint baton, you can mint more of this token at any time. May have up to 9 decimal places.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered as fixed
        expect(
            screen.getByText('18,446,744,073.709551615 (var.)'),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // The sell switch is turned on by default
        expect(screen.getByTitle('Toggle Sell Token')).toHaveProperty(
            'checked',
            true,
        );

        // The send switch is present
        expect(screen.getByTitle('Toggle Send')).toBeInTheDocument();

        // The Airdrop switch is present
        expect(screen.getByTitle('Toggle Airdrop')).toBeInTheDocument();

        // The Burn switch is present
        expect(screen.getByTitle('Toggle Burn')).toBeInTheDocument();

        // The Mint switch is present and not disabled
        expect(screen.getByTitle('Toggle Mint')).toHaveProperty(
            'disabled',
            false,
        );
    });
    it('We can list an SLP1 fungible token', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // SLP1 ad prep
        const adPrepHex =
            '0200000002666de5d5852807a13612b6ea0373643266d435822daeb39c29e5d4b67e893cda0100000064414feb64ffdf50b0eb40a6fe0c34da65e94e0cbbbc2e58f2b290f3b2bf31480b34a57c4862ee177129dc8a1ce645573cd240e5e83d336d19ff22c3a7675bc903564121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064410f0461f0e843cc5b78196e3fdb3b89d64948629645f3b44ea960c2a5ac8f5835189697165a01cc259a0f4eff931c83e110019ee5c7721a43e0dde11ba04e068d4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000019d80000000800000000001d9600060500000000000017a914e49e695e2f466e34447cb253567b8b277b60e3908722020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac2c2e0f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const adPrepTxid =
            '280b6fda5a11a94145f3b4203fb4f199d875d3621c8e4cc9d63501e73b9649bc';
        mockedChronik.setBroadcastTx(adPrepHex, adPrepTxid);

        // SLP1 ad list
        const adListHex =
            '0200000001bc49963be70135d6c94c8e1c62d375d899f1b43f20b4f34541a9115ada6f0b2801000000dd0441475230075041525449414c41b11b013fb8140dcce13f93ee99584b1c6b547ee076ed63f9ec0a6c0068ad84c5420ecd608af68134366576bae4196a83f6a8f521c50dea4acc75dda6215c7fec414c8c4c766a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000000000000000300dbf30400000000003dc7010000000000d226af0c000000002099c53f031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d01557f77ad075041525449414c88044147523087ffffffff020000000000000000376a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000019d8000000220200000000000017a91472df09389a835adb0e13e32bf1c91144ed107eef8700000000';
        const adListTxid =
            '823f652e22d154fc7bdd77ee9d9fa37c77e9649235f1430958bef68b7428b9ae';
        mockedChronik.setBroadcastTx(adListHex, adListTxid);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '72df09389a835adb0e13e32bf1c91144ed107eef';

        // We mock no existing utxos
        mockedChronik.setUtxosByScript('p2sh', EXPECTED_OFFER_P2SH, []);
        const agora = new Agora(mockedChronik);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={agora}
                route={`/send-token/${slp1FixedMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1FixedMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // Token image is rendered
        expect(
            screen.getByAltText(`icon for ${slp1FixedMocks.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for SLP is to list it
        expect(screen.getByTitle('Toggle Sell Token')).toBeEnabled();

        // The list button is disabled on load
        const listButton = screen.getByRole('button', {
            name: /List Vespene Gas/,
        });
        expect(listButton).toBeDisabled();

        // The price input is disabled until qty values are entered
        const priceInput = screen.getByPlaceholderText(
            'Enter list price (per token)',
        );
        expect(priceInput).toBeDisabled();

        const minQtyInput = screen.getByPlaceholderText('Min qty');

        // Min qty input is disabled before we enter offered qty
        expect(minQtyInput).toBeDisabled();

        // Enter token balance as offered qty
        await userEvent.type(screen.getByPlaceholderText('Offered qty'), '111');

        // The price input is no longer disabled
        expect(priceInput).toBeEnabled();

        // We see expected error msg if we try to list the token at a price where the min buy would cost less than dust
        await userEvent.type(priceInput, '0.001');

        // The min qty input updates automatically when price is set to reflect the actual min qty
        // i.e. what qty would sell for dust
        expect(minQtyInput).toHaveValue('5460');

        // But this is higher than our balance, so we get an error
        expect(
            screen.getByText(
                'The min buy must be less than or equal to the offered quantity',
            ),
        ).toBeInTheDocument();

        // Ok, let's change the price
        await userEvent.clear(priceInput);
        await userEvent.type(priceInput, '0.5');

        // Note that the min qty does not auto-update when price changes after the initial change
        expect(minQtyInput).toHaveValue('5460');

        // The buy button is disabled with invalid qty
        expect(listButton).toBeDisabled();

        // Let's lower the qty
        expect(minQtyInput).toBeEnabled();
        await userEvent.clear(minQtyInput);
        await userEvent.type(minQtyInput, '11');

        // The list button is no longer disabled
        expect(listButton).toBeEnabled();

        // Lets bump the offered qty below the min qty using the slider
        // get the agoraPartialTokenQty slider
        const sliders = screen.getAllByRole('slider');
        const agoraPartialTotalOfferedSlider = sliders[0];

        // We can move the slider and see the price of different quantities
        fireEvent.change(agoraPartialTotalOfferedSlider, {
            target: { value: 10 },
        });

        // We see expected validation error
        expect(
            screen.getByText(
                'The min buy must be less than or equal to the offered quantity',
            ),
        ).toBeInTheDocument();

        // The list button is disabled again
        expect(listButton).toBeDisabled();

        // Move it back
        fireEvent.change(agoraPartialTotalOfferedSlider, {
            target: { value: 111 },
        });

        // The fiat price is previewed correctly
        expect(
            screen.getByText('0.5000 XEC ($0.00001500 USD) per token'),
        ).toBeInTheDocument();

        // We can also set the price in fiat currency
        await userEvent.selectOptions(
            screen.getByTestId('currency-select-dropdown'),
            screen.getByTestId('fiat-option'),
        );

        // The price input is cleared when the user changes from XEC price to fiat price
        expect(priceInput).toHaveValue(null);

        // We list for $2 per token
        await userEvent.type(priceInput, '5');

        // The fiat price is previewed correctly
        expect(
            screen.getByText('$5 USD (166,666.67 XEC) per token'),
        ).toBeInTheDocument();

        // We enter a low price in fiat
        await userEvent.clear(priceInput);
        await userEvent.type(priceInput, '0.00005');

        // The fiat price is previewed correctly
        expect(
            await screen.findByText('$0.00005 USD (1.6667 XEC) per token'),
        ).toBeInTheDocument();

        // Click the now-enabled list button
        await userEvent.click(listButton);

        // We see expected confirmation modal to list the Token
        expect(screen.getByText('List VSP?')).toBeInTheDocument();
        expect(
            screen.getByText('Create the following sell offer?'),
        ).toBeInTheDocument();
        // Offered qty (actual, calculated from AgoraOffer)
        const actualOfferedQty = '110.998061056';
        expect(screen.getByText(actualOfferedQty)).toBeInTheDocument();
        // Min by (actual, calculated from AgoraOffer)
        expect(screen.getByText('11.005853696')).toBeInTheDocument();
        const userInputPricePerToken = '1.6667 XEC';
        // Actual price calculated from AgoraOffer
        const actualPricePerToken = '1.6600 XEC';
        expect(screen.getByText(userInputPricePerToken)).toBeInTheDocument();
        // User input price
        expect(screen.getByText(actualPricePerToken)).toBeInTheDocument();

        // We can cancel and not create this listing
        await userEvent.click(screen.getByText('Cancel'));

        // The confirmation modal is gone
        expect(screen.queryByText('List VSP?')).not.toBeInTheDocument();

        // We change our mind and list it
        await userEvent.click(listButton);
        // We wait for the preview to be calculated again

        expect(await screen.findByText('List VSP?')).toBeInTheDocument();
        await userEvent.click(screen.getByText('OK'));

        // We see expected toast notification for the ad setup tx
        expect(
            await screen.findByText(
                `Successful ad setup tx to offer ${actualOfferedQty} Vespene Gas for ${actualPricePerToken} per token`,
            ),
        ).toBeInTheDocument();

        // We see the expected toast notification for the successful listing tx
        expect(
            await screen.findByText(
                `${actualOfferedQty} Vespene Gas listed for ${actualPricePerToken} per token`,
            ),
        ).toBeInTheDocument();
    });
    it('We can correctly render an SLP1 NFT Parent token with no NFT Mint inputs, then create some NFT Mint inputs', async () => {
        const hex =
            '0200000002cc04a35686950a66845ebf8e37677fffcc5ee0e2b63e3f05822838273149660c010000006441878aa7e698097a4961646a2da44f701d8895cb065113fcf1d2e9f073afbc37025a5587e121bd0311a24a7af60445abfc4de7e3675a3a9f51cffddc875d88fca24121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064412f509f90f23f4b85b27452e0f25d33cef07ad8fef898e2d308c43fb0dfd6f7e00f7201336be4089171ddc094a24688882b518ec0c6958c904df12d0239a7342f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff150000000000000000d96a04534c500001810453454e44200c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc08000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000005222020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac0d070f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'cdc6afbf1ddd796388692ec9106816be1f9229ece11e545c1cbe6854ccf087ec';
        mockedChronik.setBroadcastTx(hex, txid);
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route={`/token/${slp1NftParentMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1NftParentMocks.token.genesisInfo;

        // Wait for the component to finish loading
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `The parent tokens for an NFT collection. Can be used to mint NFTs. No decimal places. The supply of this token is the potential quantity of NFTs which could be minted. If no mint batons exist, the supply is fixed.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered
        expect(screen.getByText('100 (var.)')).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // The fan-out action is available
        expect(
            screen.getByTitle('Toggle NFT Parent Fan-out'),
        ).toBeInTheDocument();

        // This action is checked by default if the user has no fanInputs
        expect(screen.getByTitle('Toggle NFT Parent Fan-out')).toHaveProperty(
            'checked',
            true,
        );

        // The mint NFT option is available
        expect(screen.getByTitle('Toggle Mint NFT')).toBeInTheDocument();

        // The mint NFT option is disabled if there are no mint inputs
        expect(screen.getByTitle('Toggle Mint NFT')).toHaveProperty(
            'disabled',
            true,
        );

        // The mint NFT switch label explains why it is disabled
        expect(screen.getByText('(no NFT mint inputs)')).toBeInTheDocument();

        // The Airdrop action is available
        expect(screen.getByTitle('Toggle Airdrop')).toBeInTheDocument();

        // The Burn action is NOT available
        expect(screen.queryByTitle('Toggle Burn')).not.toBeInTheDocument();

        // We can create NFT mint inputs by executing a fan-out tx
        await userEvent.click(
            screen.getByRole('button', { name: /Create NFT Mint Inputs/ }),
        );

        // We see expected toast notification
        expect(
            await screen.findByText('NFT Mint inputs created'),
        ).toBeInTheDocument();
    });
    it('We can correctly render an SLP1 NFT Parent token with NFT Mint inputs, then mint an NFT', async () => {
        // We need to use a unique mockedChronik for this test, with at least one nft mint input utxo
        // Mock the app with context at the Token Action screen
        const mintNftMockedChronik = await initializeCashtabStateForTests(
            {
                ...tokenTestWallet,
                state: {
                    ...tokenTestWallet.state,
                    slpUtxos: [
                        ...tokenTestWallet.state.slpUtxos,
                        {
                            outpoint: {
                                txid: '3333333333333333333333333333333333333333333333333333333333333333',
                                outIdx: 1,
                            },
                            blockHeight: 840012,
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
                                atoms: 1n,
                                isMintBaton: false,
                            },
                            path: 1899,
                        },
                    ],
                },
            },
            localforage,
        );

        // Build chronik mocks that Cashtab would use to add token info to cache
        for (const tokenMock of supportedTokens) {
            mintNftMockedChronik.setToken(tokenMock.tokenId, tokenMock.token);
            mintNftMockedChronik.setTx(tokenMock.tokenId, tokenMock.tx);
            mintNftMockedChronik.setUtxosByTokenId(
                tokenMock.tokenId,
                tokenMock.utxos,
            );
            // Set empty tx history to mock no existing NFTs
            mintNftMockedChronik.setTxHistoryByTokenId(tokenMock.tokenId, []);
        }

        const hex =
            '020000000233333333333333333333333333333333333333333333333333333333333333330100000064412564b7504e0ec0a094aae832fee07ce86f21de56153a71c99bcc50a20d4f79ba264cccd4fc39d4840af59e0f013cb535b07ae31795197db0fcda47b8ef91973b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064418758fd9e1a9eec69b262ba29227a1cbb0990dca35f7deadb91145af82e922cabe1efcb688c4a498fefbc903d6d4b5cdb8facdf624e7cbde95065b7ad014a54864121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0300000000000000003c6a04534c500001410747454e4553495304414243310b426974636f696e204142430b636173687461622e636f6d4c0001004c0008000000000000000122020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac7a330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'd215995b67194576b66ef9c593a66d9255a3ec21e424ecfbb6046643b8e0dbe6';

        mintNftMockedChronik.setBroadcastTx(hex, txid);
        render(
            <CashtabTestWrapper
                chronik={mintNftMockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route={`/token/${slp1NftParentMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1NftParentMocks.token.genesisInfo;

        // Wait for the component to finish loading
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `The parent tokens for an NFT collection. Can be used to mint NFTs. No decimal places. The supply of this token is the potential quantity of NFTs which could be minted. If no mint batons exist, the supply is fixed.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered
        expect(screen.getByText('100 (var.)')).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // The fan-out action is available
        expect(
            screen.getByTitle('Toggle NFT Parent Fan-out'),
        ).toBeInTheDocument();

        // The fan-out action is NOT checked by default because we have a single fan input
        expect(screen.getByTitle('Toggle NFT Parent Fan-out')).toHaveProperty(
            'checked',
            false,
        );

        // The mint NFT option is available
        expect(screen.getByTitle('Toggle Mint NFT')).toBeInTheDocument();

        // The mint NFT option is NOT disabled as we have a single mint input
        expect(screen.getByTitle('Toggle Mint NFT')).toHaveProperty(
            'disabled',
            false,
        );

        // The mint NFT switch label does not include the disabled explanation
        expect(
            screen.queryByText('(no NFT mint inputs)'),
        ).not.toBeInTheDocument();

        // The mint NFT switch label shows available NFT mint inputs
        expect(screen.getByText('(1 input available)')).toBeInTheDocument();

        // The Airdrop action is available
        expect(screen.getByTitle('Toggle Airdrop')).toBeInTheDocument();

        // The Burn action is NOT available
        expect(screen.queryByTitle('Toggle Burn')).not.toBeInTheDocument();

        // We can mint an NFT if we give it a name and a ticker
        await userEvent.type(
            await screen.findByPlaceholderText('Enter a name for your NFT'),
            'Bitcoin ABC',
        );

        // The mint button is disabled as the user has not entered a ticker
        expect(screen.getByRole('button', { name: /Mint NFT/ })).toHaveProperty(
            'disabled',
            true,
        );

        expect(
            screen.getByText('NFT must have a name and a ticker'),
        ).toBeInTheDocument();

        // We give the NFT a ticker
        await userEvent.type(
            await screen.findByPlaceholderText('Enter a ticker for your NFT'),
            'ABC1',
        );

        // The mint button is no longer disabled
        expect(screen.getByRole('button', { name: /Mint NFT/ })).toHaveProperty(
            'disabled',
            false,
        );

        await userEvent.click(screen.getByRole('button', { name: /Mint NFT/ }));

        // We see a preview modal, click OK
        await userEvent.click(screen.getByText('OK'));

        // We see expected toast notification
        expect(await screen.findByText('NFT Minted!')).toBeInTheDocument();
    });
    it('We can render an SLP1 NFT Parent token with a minted NFT in its collection', async () => {
        // We need to use a unique mockedChronik for this test, with at least one nft mint input utxo
        // Mock the app with context at the Token Action screen

        // Note the Token page will render all NFTs in a collection based on whether or not they exist,
        // not based on whether or not they are in the user's wallet
        // The user actions available for the child NFTs depend on whether or not the NFTs exist in the user's wallet
        const renderChildNftsMockedChronik =
            await initializeCashtabStateForTests(
                {
                    ...tokenTestWallet,
                    state: {
                        ...tokenTestWallet.state,
                        slpUtxos: [
                            ...tokenTestWallet.state.slpUtxos,
                            // Its parent NFT so this is cached
                            slp1NftParentWithChildrenMocks.utxos[0],
                            // A child NFT in the utxo set
                            slp1NftChildMocks.utxos[0],
                        ],
                    },
                },
                localforage,
            );

        // Build chronik mocks that Cashtab would use to add token info to cache
        for (const tokenMock of supportedTokens) {
            renderChildNftsMockedChronik.setToken(
                tokenMock.tokenId,
                tokenMock.token,
            );
            renderChildNftsMockedChronik.setTx(tokenMock.tokenId, tokenMock.tx);
            renderChildNftsMockedChronik.setUtxosByTokenId(
                tokenMock.tokenId,
                tokenMock.utxos,
            );
            // Set tx history of parent tokenId to empty
            renderChildNftsMockedChronik.setTxHistoryByTokenId(
                tokenMock.tokenId,
                [],
            );
        }

        // Set tx history of parent tokenId to include an NFT
        renderChildNftsMockedChronik.setTxHistoryByTokenId(
            slp1NftParentWithChildrenMocks.tokenId,
            [slp1NftChildMocks.tx],
        );

        render(
            <CashtabTestWrapper
                chronik={renderChildNftsMockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route={`/token/${slp1NftParentWithChildrenMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1NftParentWithChildrenMocks.token.genesisInfo;

        // Wait for the component to finish loading
        await waitFor(() =>
            expect(
                screen.queryByTitle('Cashtab Loading'),
            ).not.toBeInTheDocument(),
        );

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `The parent tokens for an NFT collection. Can be used to mint NFTs. No decimal places. The supply of this token is the potential quantity of NFTs which could be minted. If no mint batons exist, the supply is fixed.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The wallet balance of this token is correctly rendered
        expect(screen.getByText('1 (fixed)')).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // The fan-out action is available
        expect(
            screen.getByTitle('Toggle NFT Parent Fan-out'),
        ).toBeInTheDocument();

        // The fan-out action is NOT checked by default because we have a single fan input
        expect(screen.getByTitle('Toggle NFT Parent Fan-out')).toHaveProperty(
            'checked',
            false,
        );

        // The mint NFT option is available
        expect(screen.getByTitle('Toggle Mint NFT')).toBeInTheDocument();

        // The mint NFT option is NOT disabled as we have a single mint input
        expect(screen.getByTitle('Toggle Mint NFT')).toHaveProperty(
            'disabled',
            false,
        );

        // The mint NFT switch label does not include the disabled explanation
        expect(
            screen.queryByText('(no NFT mint inputs)'),
        ).not.toBeInTheDocument();

        // The mint NFT switch label shows available NFT mint inputs
        expect(screen.getByText('(1 input available)')).toBeInTheDocument();

        // The Airdrop action is available
        expect(screen.getByTitle('Toggle Airdrop')).toBeInTheDocument();

        // The Burn action is NOT available
        expect(screen.queryByTitle('Toggle Burn')).not.toBeInTheDocument();

        // A child NFT is rendered
        expect(screen.getByText('NFTs in this Collection')).toBeInTheDocument();

        // NFT image is rendered
        expect(
            screen.getByAltText(`icon for ${slp1NftChildMocks.tokenId}`),
        ).toBeInTheDocument();

        // NFT name is rendered
        expect(screen.getByText('Gordon Chen')).toBeInTheDocument();
    });
    it('We can list an SLP1 NFT', async () => {
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        // It's not listed yet
        mockedAgora.setActiveOffersByTokenId(slp1NftChildMocks.tokenId, []);

        // activeOffersByPubKey
        // The test wallet is selling the Saturn V NFT
        mockedAgora.setActiveOffersByPubKey(
            tokenTestWallet.paths.get(appConfig.derivationPath).pk,
            [],
        );

        // activeOffersByGroupTokenId does not need to be mocked since there are no offers here

        // NFT ad prep
        const adPrepHex =
            '0200000002268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d010000006441e4365d350b1dfee55e60cc2600ba094ed0e05c1d6a297bd3fe3f0721b88d9ec09b7d114cf0aab08a3b264153858f1a48f839f3639a8a8f9b11214038080cb9e34121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064411e9913b28017832fa38944675eb8815411fd210f9dfc8f0aa806bed055f52b6592488fdd1f9be942c19dcb98d7ddd7c55bc8b1233a64ad3dfa1c65eebbd48f254121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a22283260800000000000000019a0400000000000017a91407d2b0e6ec7b96cbfbe4a7d54e28d28fbcf65e408710310f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const adPrepTxid =
            '7b4f2b1cf9716ead03f91910bd0c08956c381987e1cb3cd9f9b4d555a7b9ba25';
        mockedChronik.setBroadcastTx(adPrepHex, adPrepTxid);

        // NFT ad list
        const adListHex =
            '020000000125bab9a755d5b4f9d93ccbe18719386c95080cbd1019f903ad6e71f91c2b4f7b01000000a70441475230074f4e4553484f544106bd7c3cc4f6aca45a7f97644b8cb5e745dee224246f38605171e8f9e0d6e036af3ea4853b08e1baa92e091bd0ceabf83d4a246e07e6b0b008a3e091b111f22a414c56222b50fe00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac7521031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dad074f4e4553484f5488044147523087ffffffff020000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326080000000000000001220200000000000017a914729833ae294590bbcf28bfbb9ad54c01b6cdb6288700000000';
        const adListTxid =
            '97cf0fed5062419ad456f22457cfeb3b15909f1de2350be48c53b24944e0de89';
        mockedChronik.setBroadcastTx(adListHex, adListTxid);

        // NFT send
        const hex =
            '0200000002268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d010000006441fff60607ba0fb6eda064075b321abc3980c249efcc0e91d4d95e464500a654476e59b76dd19bdd66f5d207a0d731550c93ce724a09e00a3bff3fcfbc08c970844121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441fe754300443dfb293619693087016c9d9a8437489d48cb7c0c3fcb6b5af6277833ff7156355aeb557145c4075b7917d90d79239ba7bf776a38fef935d8da2f7c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a222832608000000000000000122020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac84330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'daa5872d1ef95a05bd3ee59fc532aa7921a54b783a5af68c5aa9146f61d2e134';
        mockedChronik.setBroadcastTx(hex, txid);
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route={`/send-token/${slp1NftChildMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1NftChildMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // NFT image is rendered
        expect(
            screen.getByAltText(`icon for ${slp1NftChildMocks.tokenId}`),
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `eCash NFT. NFT supply is always 1. This NFT may belong to an NFT collection.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // For an NFT, we render the NFT name, not balance, as it is always 1 if we can see this page
        expect(screen.getByText('Gordon Chen')).toBeInTheDocument();

        // We see what collection this NFT is from
        expect(screen.getByText(/NFT from collection/)).toBeInTheDocument();
        expect(
            screen.getByText('The Four Half-Coins of Jin-qua'),
        ).toBeInTheDocument();

        // Token actions are available for NFTs
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for NFT is to list it
        expect(screen.getByTitle('Toggle Sell NFT')).toBeChecked();

        // We see a price input field for listing this NFT
        const priceInput = screen.getByPlaceholderText('Enter NFT list price');
        expect(priceInput).toBeInTheDocument();

        // We see expected error msg if we try to list the NFT for less than dust
        await userEvent.type(priceInput, '5.45');
        expect(
            screen.getByText('List price cannot be less than dust (5.46 XEC).'),
        ).toBeInTheDocument();

        // The List button is disabled on bad validation
        const listButton = screen.getByRole('button', {
            name: /List Gordon Chen/,
        });
        expect(listButton).toBeDisabled();

        await userEvent.clear(priceInput);

        // No validation error if NFT list price is for more than dust
        await userEvent.type(priceInput, '10000');
        expect(
            screen.queryByText(
                'List price cannot be less than dust (5.46 XEC).',
            ),
        ).not.toBeInTheDocument();

        // The List button is NOT disabled if price is greater than dust
        expect(listButton).toBeEnabled();

        // The fiat price is previewed correctly
        expect(screen.getByText('10,000 XEC = $ 0.30 USD')).toBeInTheDocument();

        // We can also set the price in fiat currency
        await userEvent.selectOptions(
            screen.getByTestId('currency-select-dropdown'),
            screen.getByTestId('fiat-option'),
        );

        // The price input is cleared when the user changes from XEC price to fiat price
        expect(priceInput).toHaveValue(null);

        // We list the NFT for $5
        await userEvent.type(priceInput, '5');

        // The fiat price is previewed correctly
        expect(
            screen.getByText(/\$ 5 USD = 166,666.67 XEC/),
        ).toBeInTheDocument();

        // Click the now-enabled list button
        await userEvent.click(listButton);

        // We see expected confirmation modal to list the NFT
        expect(screen.getByText(/List GC for \$5 USD/)).toBeInTheDocument();

        // We can cancel and not list the NFT
        await userEvent.click(screen.getByText('Cancel'));

        // The confirmation modal is gone
        expect(
            screen.queryByText(/List GC for \$ 5 USD/),
        ).not.toBeInTheDocument();

        // We change our mind
        await userEvent.click(listButton);
        await userEvent.click(screen.getByText('OK'));

        // We see expected toast notification for the ad setup tx
        expect(await screen.findByText('Created NFT ad')).toBeInTheDocument();
        // We see the expected toast notification for the successful listing tx
        expect(
            await screen.findByText(/NFT listed for 166,666.67 XEC/),
        ).toBeInTheDocument();

        // Screen should check for new listings and show the listing on this page
        // Cannot test this without regtest, as we would need MockedAgora to show no
        // active offers on load, then 1 offer after listing
        // Can confirm in manual testing
    });
    it('We can send an SLP1 NFT', async () => {
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        // It's not listed yet
        mockedAgora.setActiveOffersByTokenId(slp1NftChildMocks.tokenId, []);

        // NFT send
        const hex =
            '0200000002268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d010000006441fff60607ba0fb6eda064075b321abc3980c249efcc0e91d4d95e464500a654476e59b76dd19bdd66f5d207a0d731550c93ce724a09e00a3bff3fcfbc08c970844121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441fe754300443dfb293619693087016c9d9a8437489d48cb7c0c3fcb6b5af6277833ff7156355aeb557145c4075b7917d90d79239ba7bf776a38fef935d8da2f7c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a222832608000000000000000122020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac84330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'daa5872d1ef95a05bd3ee59fc532aa7921a54b783a5af68c5aa9146f61d2e134';
        mockedChronik.setBroadcastTx(hex, txid);
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route={`/send-token/${slp1NftChildMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1NftChildMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // On load, default action for NFT is to list it
        const sellActionSwitch = screen.getByTitle('Toggle Sell NFT');
        expect(sellActionSwitch).toBeChecked();

        // Sending is disabled
        const sendActionSwitch = screen.getByTitle('Toggle Send');

        expect(sendActionSwitch).not.toBeChecked();

        // When we enable Sending, Selling is disabled, and Sending is enabled
        await userEvent.click(sendActionSwitch);
        expect(sendActionSwitch).toBeChecked();
        expect(sellActionSwitch).not.toBeChecked();

        // We see an Address input
        const addrInput = screen.getByPlaceholderText('Address');
        expect(addrInput).toBeInTheDocument();

        // Send button is disabled before address entry
        const sendButton = screen.getByRole('button', {
            name: /Send GC/,
        });
        expect(sendButton).toBeDisabled();

        // We can enter an address
        await userEvent.type(
            addrInput,
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        );

        // Now the button is enabled
        expect(sendButton).toBeEnabled();

        // We can send an NFT
        await userEvent.click(sendButton);

        expect(await screen.findByText('NFT sent')).toBeInTheDocument();
    });
    it('SLP1 NFT page will update cashtab token cache for the NFT if it does not include groupTokenId, and for its parent if it is not in cache', async () => {
        // Use wallet with nft utxo as only utxo
        // Preset a cache without groupTokenId
        // Use existing tx and token mocks

        // We need to use a unique mockedChronik for this test, with a minted NFT utxo but no parent utxo

        // The user actions available for the child NFTs depend on whether or not the NFTs exist in the user's wallet
        const renderChildNftsMockedChronik =
            await initializeCashtabStateForTests(
                {
                    ...tokenTestWallet,
                    state: {
                        ...tokenTestWallet.state,
                        slpUtxos: [
                            // Only a child NFT in the utxo set
                            slp1NftChildMocks.utxos[0],
                        ],
                        tokens: new Map([
                            [
                                '5d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326',
                                '1',
                            ],
                        ]),
                    },
                },
                localforage,
            );
        const mockCashtabCacheWithNft = new CashtabCache([
            [
                slp1NftChildMocks.tokenId,
                {
                    // note that this mock DOES NOT include groupTokenId
                    ...slp1NftChildMocks.token,
                    genesisSupply: '1',
                    genesisOutputScripts: [
                        '76a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac',
                    ],
                    genesisMintBatons: 0,
                },
            ],
        ]);

        await localforage.setItem(
            'cashtabCache',
            cashtabCacheToJSON(mockCashtabCacheWithNft),
        );

        // Build chronik mocks that Cashtab would use to add token info to cache
        for (const tokenMock of supportedTokens) {
            renderChildNftsMockedChronik.setToken(
                tokenMock.tokenId,
                tokenMock.token,
            );
            renderChildNftsMockedChronik.setTx(tokenMock.tokenId, tokenMock.tx);
            renderChildNftsMockedChronik.setUtxosByTokenId(
                tokenMock.tokenId,
                tokenMock.utxos,
            );
            // Set tx history of parent tokenId to empty
            renderChildNftsMockedChronik.setTxHistoryByTokenId(
                tokenMock.tokenId,
                [],
            );
        }

        // Set tx history of parent tokenId to include an NFT
        renderChildNftsMockedChronik.setTxHistoryByTokenId(
            slp1NftParentWithChildrenMocks.tokenId,
            [slp1NftChildMocks.tx],
        );

        // Set agora to show no active offers for this nft
        mockAgora.setActiveOffersByTokenId(slp1NftChildMocks.tokenId, []);

        render(
            <CashtabTestWrapper
                chronik={renderChildNftsMockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route={`/token/${slp1NftChildMocks.tokenId}`}
            />,
        );

        const { tokenName } = slp1NftChildMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // NFT image is rendered
        expect(
            screen.getByAltText(`icon for ${slp1NftChildMocks.tokenId}`),
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                `eCash NFT. NFT supply is always 1. This NFT may belong to an NFT collection.`,
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The NFT Token name is the title
        expect(screen.getByText('Gordon Chen')).toBeInTheDocument();

        // We see what collection this NFT is from
        expect(screen.getByText(/NFT from collection/)).toBeInTheDocument();
        expect(
            screen.getByText('The Four Half-Coins of Jin-qua'),
        ).toBeInTheDocument();

        // Token actions are available for NFTs
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, the default action for an NFT is to list it
        const nftListInput = screen.getByPlaceholderText(
            'Enter NFT list price',
        );
        expect(nftListInput).toBeInTheDocument();
    });
    it('We show an agora query error if we cannot get active offers for an NFT token id', async () => {
        const heismanNftTokenId = heismanNftOneOffer.token.tokenId;

        // Mock the API calls for getting and caching this token's info
        mockedChronik.setToken(heismanNftTokenId, heismanNftOneCache.token);
        mockedChronik.setTx(heismanNftTokenId, heismanNftOneCache.tx);
        // Also mock for the collection
        mockedChronik.setToken(
            heismanCollectionCacheMocks.tokenId,
            heismanCollectionCacheMocks.token,
        );
        mockedChronik.setTx(
            heismanCollectionCacheMocks.tokenId,
            heismanCollectionCacheMocks.tx,
        );

        // Mock an error querying this NFT listing
        const mockedAgora = new MockAgora();

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(
            heismanNftTokenId,
            new Error('some agora error'),
        );

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route={`/send-token/${heismanNftTokenId}`}
            />,
        );

        const { tokenName } = cachedHeismanNftOne.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // On load, we see expected agora query error
        expect(
            await screen.findByText('Error querying NFT offers'),
        ).toBeInTheDocument();
    });
    it('We show an agora oneshot listing for an SLP1 NFT if it is for sale', async () => {
        const heismanNftTokenId = heismanNftOneOffer.token.tokenId;

        // Mock the API calls for getting and caching this token's info
        mockedChronik.setToken(heismanNftTokenId, heismanNftOneCache.token);
        mockedChronik.setTx(heismanNftTokenId, heismanNftOneCache.tx);
        // Also mock for the collection
        mockedChronik.setToken(
            heismanCollectionCacheMocks.tokenId,
            heismanCollectionCacheMocks.token,
        );
        mockedChronik.setTx(
            heismanCollectionCacheMocks.tokenId,
            heismanCollectionCacheMocks.tx,
        );

        // Mock an error querying this NFT listing
        const mockedAgora = new MockAgora();

        // then mock for each one agora.activeOffersByTokenId(offeredTokenId)
        mockedAgora.setActiveOffersByTokenId(heismanNftTokenId, [
            heismanNftOneOffer,
        ]);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route={`/send-token/${heismanNftTokenId}`}
            />,
        );

        const { tokenName, tokenTicker } = cachedHeismanNftOne.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // On load, we can buy the offer
        expect(
            await screen.findByText(`Buy ${tokenName} (${tokenTicker})`),
        ).toBeInTheDocument();
    });
    it('ALP token', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockAgora}
                ecc={ecc}
                route={`/send-token/${alpMocks.tokenId}`}
            />,
        );

        const { tokenName } = alpMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // We can click an info icon to learn more about this token type
        await userEvent.click(
            await screen.findByRole('button', {
                name: 'Click for more info about this token type',
            }),
        );

        expect(
            screen.getByText(
                'ALP v1 fungible token. Token may be of fixed or variable supply. If you have a mint baton, you can mint more of this token at any time. May have up to 9 decimal places. ALP tokens use EMPP technology, which supports more token actions compared to SLP and more complex combinations of token and app actions. ALP token txs may have up to 127 outputs, though current OP_RETURN size de facto limits a single tx to 29 outputs.',
            ),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered
        expect(screen.getByText('111,367.0000 (var.)')).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // We can list, which is also the default action
        expect(screen.getByTitle('Toggle Sell Token')).toBeEnabled();
        // We can send
        expect(screen.getByTitle('Toggle Send')).toBeInTheDocument();
        // We can burn
        expect(screen.getByTitle('Toggle Burn')).toBeInTheDocument();
        // Because we do not have the mint baton for this token, the Mint action is NOT available
        expect(screen.queryByTitle('Toggle Mint')).not.toBeInTheDocument();
    });
    it('We can send an ALP token', async () => {
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        // It's not listed yet
        mockedAgora.setActiveOffersByTokenId(alpMocks.tokenId, []);

        // ALP send
        const hex =
            '020000000288bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441999a894cafbab21d590da6ce07e572935144c480bce48c4df3efb74e9ee2fd3a4de61a40f93c28775c7b135a6a9ccba7d880bd5776d289b6c8ae5752afee24b34121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441f6e2b2a66d8676854e281f5af375bc56d4f359cb4be1e178d330720384da79a5216bd7a132bfd44654835c95a8d81b099b03e953d4a720187255ef1c9a1b646e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0400000000000000003a6a5037534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c02102700000000301b0f00000022020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac18310f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            '33313eaf3365d9bf440645c5fffa8ed91681d1e1464afe598a564cdc76855c04';
        mockedChronik.setBroadcastTx(hex, txid);

        // Mock NOT blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${alpMocks.tokenId}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: false }),
            });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route={`/send-token/${alpMocks.tokenId}`}
            />,
        );

        const { tokenName } = alpMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // Wait for supply and actions to load
        // The supply is correctly rendered
        expect(
            await screen.findByText('111,367.0000 (var.)'),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // Click Send
        await userEvent.click(screen.getByTitle('Toggle Send'));

        // Wait for address input to render
        expect(
            await screen.findByPlaceholderText('Address'),
        ).toBeInTheDocument();

        // On load, default action for ALP is to send it
        const sendActionSwitch = screen.getByTitle('Toggle Send');
        await waitFor(() => expect(sendActionSwitch).toBeChecked());

        // We see an Address input
        const addrInput = screen.getByPlaceholderText('Address');
        expect(addrInput).toBeInTheDocument();

        // Send button is disabled before address and amount entry
        const sendButton = screen.getByRole('button', {
            name: /Send tCRD/,
        });
        expect(sendButton).toBeDisabled();

        // We can enter an address
        await userEvent.type(
            addrInput,
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        );
        const amountInputEl = screen.getByPlaceholderText('Amount');
        const amountInput = '1';
        await userEvent.type(amountInputEl, amountInput);

        // Now the button is enabled
        expect(sendButton).toBeEnabled();

        // We can send an ALP token
        await userEvent.click(sendButton);

        const sendTokenSuccessNotification = await screen.findByText(
            'eToken sent',
        );
        expect(sendTokenSuccessNotification).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${txid}`,
        );
    });
    it('We can burn an ALP token with change', async () => {
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        // It's not listed yet
        mockedAgora.setActiveOffersByTokenId(alpMocks.tokenId, []);

        // ALP burn
        const hex =
            '020000000288bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c250100000064416f667f359f04e273d524eac5fdaede0bfaf483daaf74f2ab5ba849c3a126b36b059003ef22b647d5265b74938e50c40505c1ad56474d0af2930192994011b9c84121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441ed0c24a83ec9137bc2cc367f674b1932de280f3bc2fbfd9cd70b840e61ccf5fa272e714ba06d3060574df97bc135acae2367d00fdd67ce2bbf347193a871348c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000656a5030534c503200044255524e49884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c10270000000031534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c01301b0f00000022020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac28330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'f71293a94bd444c0b82ce6a6a8a1d2ae182f6a848cd2382bb6ca496955184fdf';
        mockedChronik.setBroadcastTx(hex, txid);

        // Mock NOT blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${alpMocks.tokenId}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: false }),
            });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route={`/send-token/${alpMocks.tokenId}`}
            />,
        );

        const { tokenName } = alpMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // Wait for supply and actions to load
        // The supply is correctly rendered
        expect(
            await screen.findByText('111,367.0000 (var.)'),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for ALP is to list

        // Select burn
        await userEvent.click(screen.getByTitle('Toggle Burn'));

        await userEvent.type(screen.getByPlaceholderText('Burn Amount'), '1');

        // Click the Burn button
        // Note we button title is the token ticker
        await userEvent.click(
            await screen.findByRole('button', { name: /Burn tCRD/ }),
        );

        // We see a modal and enter the correct confirmation msg
        await userEvent.type(
            screen.getByPlaceholderText(`Type "burn tCRD" to confirm`),
            'burn tCRD',
        );

        // Click the Confirm button
        await userEvent.click(screen.getByRole('button', { name: /OK/ }));

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
    it('We can burn an ALP token without change', async () => {
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        // It's not listed yet
        mockedAgora.setActiveOffersByTokenId(alpMocks.tokenId, []);

        // ALP burn all
        const hex =
            '020000000288bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c250100000064413919d2894e681586f285af178ef2c8d86b2f008e31519b1592c76cae7bee17eb4bb1558db35b225a15a2ba1c1f3d86564e12adfa0d5c012427f096398cdff20e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf79261803000000644126a0f23966db5ba3212e4d5c545a186d407af4d110335e521c867e63549ade8d25da8a911343d9bf9275bbb58255cd445a1b3fc14ae35a89b8964cfbe47299aa4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000336a5030534c503200044255524e49884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c40420f00000022020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac8c330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'f413a14acc391c2541f0dea477cf7ee07cf6256bc3b201d6b276272f2fdda407';
        mockedChronik.setBroadcastTx(hex, txid);

        // Mock NOT blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${alpMocks.tokenId}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: false }),
            });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route={`/send-token/${alpMocks.tokenId}`}
            />,
        );

        const { tokenName } = alpMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // Wait for supply and actions to load
        // The supply is correctly rendered
        expect(
            await screen.findByText('111,367.0000 (var.)'),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for ALP is to list

        // Select burn
        await userEvent.click(screen.getByTitle('Toggle Burn'));

        // Hit max for max burn
        await userEvent.click(screen.getByRole('button', { name: /max/ }));

        // Max is input
        const thisWalletAlpBalance = '100.0000';
        expect(screen.getByPlaceholderText('Burn Amount')).toHaveValue(
            thisWalletAlpBalance,
        );

        // Click the Burn button
        // Note we button title is the token ticker
        await userEvent.click(
            await screen.findByRole('button', { name: /Burn tCRD/ }),
        );

        // We see a modal and enter the correct confirmation msg
        await userEvent.type(
            screen.getByPlaceholderText(`Type "burn tCRD" to confirm`),
            'burn tCRD',
        );

        // Click the Confirm button
        await userEvent.click(screen.getByRole('button', { name: /OK/ }));

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
    it('We can mint max one-output ALP token qty', async () => {
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        // It's not listed yet
        mockedAgora.setActiveOffersByTokenId(alpMocks.tokenId, []);

        // New mocked chronik since we change the wallet to include a mint baton for this token
        const walletWithAlpMintBaton = {
            ...tokenTestWallet,
            state: {
                ...tokenTestWallet.state,
                slpUtxos: [
                    ...tokenTestWallet.state.slpUtxos,
                    {
                        outpoint: {
                            txid: '250c93fd6bc2f1853a41d2fd1f5754a92f79f952f10ab038401be1600d5cbb88',
                            outIdx: 2,
                        },
                        blockHeight: 836452,
                        isCoinbase: false,
                        sats: 546n,
                        isFinal: true,
                        token: {
                            tokenId:
                                '7cd7cd7c54167d306e770f972b564584c44cb412ee45839b4b97bb6e724c8849',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            atoms: 0n,
                            isMintBaton: true,
                        },
                        path: 1899,
                    },
                ],
            },
        };
        const mintAlpMockedChronik = await initializeCashtabStateForTests(
            walletWithAlpMintBaton,
            localforage,
        );

        // Mock cache info
        mintAlpMockedChronik.setToken(alpMocks.tokenId, alpMocks.token);
        mintAlpMockedChronik.setTx(alpMocks.tokenId, alpMocks.tx);
        mintAlpMockedChronik.setUtxosByTokenId(
            alpMocks.tokenId,
            alpMocks.utxos,
        );
        // Set empty tx history
        mintAlpMockedChronik.setTxHistoryByTokenId(alpMocks.tokenId, []);

        // ALP mint
        const hex =
            '020000000288bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25020000006441acdadb019c561b7bfa761695503eb1250d3ae1f34e66eeb3c4c8fb561b4ec95291bde678871451316a8f0472922d25936dd341eb90eb6bb3ccde98b00a2138da4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441fc7a554a708c3e6a2fc72e7c96871521678d0a36e336a599b39eac6a36f4ecedcfd2a728c8e639b5946fde677f1afa9e31468531476dd66fce1adfc760e7e2ff4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000356a5032534c503200044d494e5449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c01ffffffffffff0122020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22310f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            '28c733455a50be334948600bcdf0817610b0321ceba3da52c7c7ffec995320f0';
        mintAlpMockedChronik.setBroadcastTx(hex, txid);

        // Mock NOT blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${alpMocks.tokenId}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: false }),
            });

        render(
            <CashtabTestWrapper
                chronik={mintAlpMockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route={`/send-token/${alpMocks.tokenId}`}
            />,
        );

        const { tokenName } = alpMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // Wait for supply and actions to load
        // The supply is correctly rendered
        expect(
            await screen.findByText('111,367.0000 (var.)'),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // Select mint
        await userEvent.click(screen.getByTitle('Toggle Mint'));

        // Max qty
        await userEvent.click(screen.getByRole('button', { name: /max/ }));

        // Max is input
        const maxMintQty = '28147497671.0655';

        expect(screen.getByPlaceholderText('Mint Amount')).toHaveValue(
            maxMintQty,
        );

        // Click the Mint button
        // Note we button title is the token ticker
        await userEvent.click(
            await screen.findByRole('button', { name: /Mint tCRD/ }),
        );

        const successNotification = await screen.findByText(
            '⚗️ Minted 28147497671.0655 tCRD',
        );
        await waitFor(() =>
            expect(successNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${txid}`,
            ),
        );
    });
    it('We can list an ALP fungible token', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // ALP offer tx
        const offerHex =
            '020000000288bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441d32ae72fa880a40975a475147443a3a7fe10308178ad38d80e6a2428921732b0699849443d8e24124a8ee5b75f1e9f74628fdb8cd0c9704d8cd0c70df65828e94121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064415fc18bb026bc3122776e708b8cdba9225494c704c1feca7aefb36b592abed96568cd57cb3504769bc4019ec0f36990c28c57012cefe805e4d3b046cc308bc86b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000866a504b41475230075041525449414c01009b630800000000005532000000000000d6b24701000000002099c53f031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d37534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c0200420f000000400000000000220200000000000017a91450eb4978c85ec89b63e37e6b87409c9f5815c7058722020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac83300f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const offerTxid =
            'e00be7011ee5d585cbd54049570ea0754ab0d5c05acf6cb01c25afa3aa61663d';
        mockedChronik.setBroadcastTx(offerHex, offerTxid);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '50eb4978c85ec89b63e37e6b87409c9f5815c705';

        // We mock no existing utxos
        mockedChronik.setUtxosByScript('p2sh', EXPECTED_OFFER_P2SH, []);

        // Note that we cannot use mockedAgora to avoid agoraQueryErrors, as we need a proper
        // agora object to build the partial
        const agora = new Agora(mockedChronik);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={agora}
                route={`/send-token/${alpMocks.tokenId}`}
            />,
        );

        const { tokenName } = alpMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // Token image is rendered
        expect(
            screen.getByAltText(`icon for ${alpMocks.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for ALP is to list it
        expect(screen.getByTitle('Toggle Sell Token')).toBeEnabled();

        // The list button is disabled on load
        const listButton = screen.getByRole('button', {
            name: /List Test CRD/,
        });
        expect(listButton).toBeDisabled();

        // The price input is disabled until qty values are entered
        const priceInput = screen.getByPlaceholderText(
            'Enter list price (per token)',
        );
        expect(priceInput).toBeDisabled();

        // Enter token balance as offered qty
        await userEvent.type(screen.getByPlaceholderText('Offered qty'), '100');

        // The price input is no longer disabled
        expect(priceInput).toBeEnabled();

        // Enter a price
        await userEvent.type(priceInput, '0.001');

        const minQtyInput = screen.getByPlaceholderText('Min qty');

        // The quantity updates automatically
        expect(minQtyInput).toHaveValue('5460');

        // But because this price is so low, now the min qty is actually higher than our token balance
        // So we see an error
        expect(
            screen.getByText(
                'The min buy must be less than or equal to the offered quantity',
            ),
        ).toBeInTheDocument();

        // Ok let's back off our min qty
        await userEvent.clear(minQtyInput);
        await userEvent.type(minQtyInput, '5');

        // Now we have an error because the min qty is too low
        expect(
            screen.getByText(
                'Total cost of minimum buy below dust. Min offered qty must be at least 5,460.',
            ),
        ).toBeInTheDocument();

        // The buy button is disabled with invalid qty
        expect(listButton).toBeDisabled();

        // We'll need to raise the price because we don't have that many tokens
        await userEvent.clear(priceInput);
        await userEvent.type(priceInput, '1');

        // But now still below dust
        expect(
            screen.getByText(
                'Total cost of minimum buy below dust. Min offered qty must be at least 5.46.',
            ),
        ).toBeInTheDocument();

        // Ok well we can do that
        await userEvent.clear(minQtyInput);
        await userEvent.type(minQtyInput, '5.46');

        // No more error
        expect(
            screen.queryByText(
                'Total cost of minimum buy below dust. Min offered qty must be at least 5.46.',
            ),
        ).not.toBeInTheDocument();

        // The list button is no longer disabled
        expect(listButton).toBeEnabled();

        // Let's use a higher price though because that's what the test has mocks for
        await userEvent.clear(priceInput);
        await userEvent.type(priceInput, '33');

        // The fiat price is previewed correctly
        expect(
            screen.getByText('33 XEC ($0.0009900 USD) per token'),
        ).toBeInTheDocument();

        // We can also set the price in fiat currency
        await userEvent.selectOptions(
            screen.getByTestId('currency-select-dropdown'),
            screen.getByTestId('fiat-option'),
        );

        // The price input is cleared when the user changes from XEC price to fiat price
        expect(priceInput).toHaveValue(null);

        // We list for $5 per token
        await userEvent.type(priceInput, '5');

        // The fiat price is previewed correctly
        expect(
            screen.getByText('$5 USD (166,666.67 XEC) per token'),
        ).toBeInTheDocument();

        // We enter a low price in fiat
        await userEvent.clear(priceInput);
        await userEvent.type(priceInput, '0.0005');

        // The fiat price is previewed correctly
        expect(
            await screen.findByText('$0.0005 USD (16.67 XEC) per token'),
        ).toBeInTheDocument();

        // We can have a lower min qty now since the price is higher
        await userEvent.clear(minQtyInput);
        await userEvent.type(minQtyInput, '1');

        // Click the now-enabled list button
        expect(listButton).toBeEnabled();
        await userEvent.click(listButton);

        // We see expected confirmation modal to list the Token
        expect(screen.getByText('List tCRD?')).toBeInTheDocument();
        expect(
            screen.getByText('Create the following sell offer?'),
        ).toBeInTheDocument();
        // Offered qty (actual, calculated from AgoraOffer)
        const actualOfferedQty = '99.9936';
        expect(screen.getByText(actualOfferedQty)).toBeInTheDocument();
        // Min buy (actual, calculated from AgoraOffer)
        expect(screen.getByText('1.0240')).toBeInTheDocument();
        // Actual price calculated from AgoraOffer
        const actualPricePerTokenForMinBuy = '16.67 XEC';
        expect(
            screen.getAllByText(actualPricePerTokenForMinBuy)[0],
        ).toBeInTheDocument();
        // User input price
        expect(screen.getAllByText('16.67 XEC')[1]).toBeInTheDocument();

        // We can cancel and not create this listing
        await userEvent.click(screen.getByText('Cancel'));

        // The confirmation modal is gone
        expect(screen.queryByText('List tCRD?')).not.toBeInTheDocument();

        // We change our mind and list it
        await userEvent.click(listButton);

        expect(await screen.findByText('List tCRD?')).toBeInTheDocument();
        await userEvent.click(screen.getByText('OK'));

        // We see the expected toast notification for the successful listing tx
        expect(
            await screen.findByText(
                `${actualOfferedQty} Test CRD listed for ${actualPricePerTokenForMinBuy} per token`,
            ),
        ).toBeInTheDocument();
    });
    it('We can redeem XECX for XEC 1:1 using a workflow unique to XECX', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // XECX offer tx
        const offerHex =
            '020000000288bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441c664c7bc3a13726a17771588813eb43276b297b91f5475435c70d08f5653646d979911c752445ebbd8f973ac218978d3bbf814952b9aae5c6d0630dbd2b74dd04121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441dfaa9df0a82c895fe97837d7622d16cf9cfda9f3f21fae7294556b235effd2fc01b33d3b59c0d813bf586bc100a661d45ef2f13de50560f1d8240c3c4390eaff4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000806a504b41475230075041525449414c000063080000000000006308000000000000c09ef87f000000002099c53f031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d31534c5032000453454e44d44ecf795494b063aa10be876868880df8ef822577c1a546fb1cd9b6c2f57bc60140420f000000220200000000000017a9149c3889f324767ca4462614f85835776ab68990a987f6320f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const offerTxid =
            'b32c2b51155cc4ffe9260d81aa7ce2d9c370f5a5b555ca44bfda578e3604aa85';
        mockedChronik.setBroadcastTx(offerHex, offerTxid);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '9c3889f324767ca4462614f85835776ab68990a9';

        // We mock no existing utxos
        mockedChronik.setUtxosByScript('p2sh', EXPECTED_OFFER_P2SH, []);

        // Note that we cannot use mockedAgora to avoid agoraQueryErrors, as we need a proper
        // agora object to build the partial
        const agora = new Agora(mockedChronik);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={agora}
                route={`/send-token/${tokenMockXecx.tokenId}`}
            />,
        );

        const { tokenName } = tokenMockXecx.tokenInfo.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // XECX token icon is rendered
        expect(
            screen.getByAltText(`icon for ${tokenMockXecx.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for XECX is to redeem it
        expect(screen.getByTitle('Toggle Redeem XECX')).toBeEnabled();

        // The redeem button is disabled on load
        const redeemButton = screen.getByRole('button', {
            name: /Redeem XECX for XEC/,
        });
        expect(redeemButton).toBeDisabled();

        // We do not see a price input
        expect(
            screen.queryByPlaceholderText('Enter list price (per token)'),
        ).not.toBeInTheDocument();

        // We do not see a min qty input
        expect(
            screen.queryByPlaceholderText('Min qty'),
        ).not.toBeInTheDocument();

        // Enter amount to redeem
        await userEvent.type(
            screen.getByPlaceholderText('Offered qty'),
            '5.45',
        );

        // This is below dust so we get an error
        expect(
            screen.getByText('Cannot redeem less than 5.46 XECX'),
        ).toBeInTheDocument();
        // The redeem button is still disabled
        expect(redeemButton).toBeDisabled();

        // OK we redeem more than dust
        await userEvent.clear(screen.getByPlaceholderText('Offered qty'));

        await userEvent.type(
            screen.getByPlaceholderText('Offered qty'),
            '10000',
        );

        expect(screen.getByPlaceholderText('Offered qty')).toHaveValue('10000');

        // The redeem button is now enabled
        expect(redeemButton).toBeEnabled();

        // The fiat price is previewed correctly
        expect(
            screen.getByText('1 XEC ($0.00003000 USD) per token'),
        ).toBeInTheDocument();

        // Redeem
        await userEvent.click(redeemButton);

        // We see expected confirmation modal to list the Token
        expect(screen.getByText('List XECX?')).toBeInTheDocument();
        expect(
            screen.getByText('Create the following sell offer?'),
        ).toBeInTheDocument();
        // Offered qty (actual, calculated from AgoraOffer)
        const actualOfferedQty = '10,000.00';
        // We see this three times bc it is also the min buy for XECX redemptions and behind the modal
        expect(screen.getAllByText(actualOfferedQty)).toHaveLength(3);
        // Actual price calculated from AgoraOffer
        const actualPricePerTokenForMinBuy = '1 XEC';
        // We see the price two times (modal and preview behind it)
        expect(screen.getAllByText(actualPricePerTokenForMinBuy)).toHaveLength(
            2,
        );

        // We can cancel and not create this listing
        await userEvent.click(screen.getByText('Cancel'));

        // The confirmation modal is gone
        expect(screen.queryByText('List XECX?')).not.toBeInTheDocument();

        // We change our mind and list it
        await userEvent.click(redeemButton);

        expect(await screen.findByText('List XECX?')).toBeInTheDocument();
        await userEvent.click(screen.getByText('OK'));

        // We see the expected toast notification for the successful listing tx
        expect(
            await screen.findByText(
                `${actualOfferedQty} Staked XEC listed for ${actualPricePerTokenForMinBuy} per token`,
            ),
        ).toBeInTheDocument();
    });
    it('We can redeem 1 Firma for $1 of XEC using a workflow unique to Firma', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // Mock a bid price
        when(fetch)
            .calledWith(`https://firma.cash/api/bid`)
            .mockResolvedValue({
                json: () => Promise.resolve({ bid: 40000.0 }),
            });

        // FIRMA offer tx
        const offerHex =
            '020000000288bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441243d709268b45b7917eb446ed0cb447fa71eec05977b7b558cb2d7cbae3b1b8bc190810e03b84ceb037b7295bca76e76ad83d48a8f8d9f891de93995adca244d4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441c9656b6789947fe5fe369072e95fb3f39a1b21f37b6a1602ee609840ce5b77c55d0b5d1e455020629d28c4791fa705b535e0dd0a4563e130bdcbb5129b5a57ef4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000866a504b41475230075041525449414c0000e253000000000000360000000000000040b9fe7f000000002099c53f031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d37534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302a08601000000a0bb0d000000220200000000000017a914d269ef0be66e9b689bee7a071d08cc0a7151b32a8722020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac83300f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const offerTxid =
            '322da86c0fd6b008298bc21f6a344647d225f3ed20ff597860d7e9ab9f5428f7';
        mockedChronik.setBroadcastTx(offerHex, offerTxid);

        // Make sure it's cached
        mockedChronik.setTx(FIRMA.tx.txid, FIRMA.tx);
        mockedChronik.setToken(FIRMA.tokenId, FIRMA.token);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '28967de39bdb1af326e5cb2ffecf1f320dedfb04';
        // Note we have to create a second partial to get an acceptable price
        const EXPECTED_SECOND_P2SH = 'd269ef0be66e9b689bee7a071d08cc0a7151b32a';

        // We mock no existing utxos
        mockedChronik.setUtxosByScript('p2sh', EXPECTED_OFFER_P2SH, []);
        mockedChronik.setUtxosByScript('p2sh', EXPECTED_SECOND_P2SH, []);

        // Note that we cannot use mockedAgora to avoid agoraQueryErrors, as we need a proper
        // agora object to build the partial
        const agora = new Agora(mockedChronik);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={agora}
                route={`/send-token/${FIRMA.tokenId}`}
            />,
        );

        const { tokenName } = FIRMA.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // XECX token icon is rendered
        expect(
            screen.getByAltText(`icon for ${FIRMA.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for FIRMA is to redeem it
        expect(screen.getByTitle('Toggle Redeem FIRMA')).toBeEnabled();

        // The redeem button is disabled on load
        const redeemButton = await screen.findByRole('button', {
            name: /Redeem FIRMA for XEC/,
        });
        expect(redeemButton).toBeDisabled();

        // We do not see a price input
        expect(
            screen.queryByPlaceholderText('Enter list price (per token)'),
        ).not.toBeInTheDocument();

        // We do not see a min qty input
        expect(
            screen.queryByPlaceholderText('Min qty'),
        ).not.toBeInTheDocument();

        // Enter amount to redeem
        await userEvent.type(
            screen.getByPlaceholderText('Offered qty'),
            '0.009',
        );

        // This is below firma min redemption so we get an error
        expect(
            screen.getByText('Cannot redeem less than 0.01 FIRMA'),
        ).toBeInTheDocument();

        // The redeem button is still disabled
        expect(redeemButton).toBeDisabled();

        // OK we redeem more than dust
        await userEvent.clear(screen.getByPlaceholderText('Offered qty'));

        await userEvent.type(screen.getByPlaceholderText('Offered qty'), '10');

        expect(screen.getByPlaceholderText('Offered qty')).toHaveValue('10');

        // The redeem button is now enabled
        expect(redeemButton).toBeEnabled();

        // Redeem
        await userEvent.click(redeemButton);

        // Async as we must wait for multiple partials
        expect(await screen.findByText('List FIRMA?')).toBeInTheDocument();
        expect(
            screen.getByText('Create the following sell offer?'),
        ).toBeInTheDocument();

        // Offered qty (actual, calculated from AgoraOffer)
        const actualOfferedQty = '10.0000';
        // We see this two times bc it is also behind the modal
        expect(screen.getAllByText(actualOfferedQty)).toHaveLength(2);
        // Actual price calculated from AgoraOffer
        const actualPricePerTokenForMinBuy = '39,766.67 XEC';
        // We see the price once; it is not previewed as we need to calculate it before we
        // show the modal
        expect(
            screen.getByText(actualPricePerTokenForMinBuy),
        ).toBeInTheDocument();
        // We see the full receive XEC amount
        expect(screen.getByText('You receive:')).toBeInTheDocument();
        expect(screen.getByText('397,666.67 XEC')).toBeInTheDocument();

        // We can cancel and not create this listing
        await userEvent.click(screen.getByText('Cancel'));

        // The confirmation modal is gone
        expect(screen.queryByText('List FIRMA?')).not.toBeInTheDocument();

        // We change our mind and list it
        await userEvent.click(redeemButton);

        expect(await screen.findByText('List FIRMA?')).toBeInTheDocument();
        await userEvent.click(screen.getByText('OK'));

        // We see the expected toast notification for the successful listing tx
        expect(
            await screen.findByText(
                `${actualOfferedQty} Firma listed for ${actualPricePerTokenForMinBuy} per token`,
            ),
        ).toBeInTheDocument();
    });
    it('We show expected error if we are unable to get FIRMA bid price from API', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // Mock a bid price
        when(fetch)
            .calledWith(`https://firma.cash/api/bid`)
            .mockResolvedValue(new Error('error getting firma bid price'));

        // Make sure FIRMA is cached
        mockedChronik.setTx(FIRMA.tx.txid, FIRMA.tx);
        mockedChronik.setToken(FIRMA.tokenId, FIRMA.token);

        // Note that we cannot use mockedAgora to avoid agoraQueryErrors, as we need a proper
        // agora object to build the partial
        const agora = new Agora(mockedChronik);

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                ecc={ecc}
                agora={agora}
                route={`/token/${FIRMA.tokenId}`}
            />,
        );

        const { tokenName } = FIRMA.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // XECX token icon is rendered
        expect(
            screen.getByAltText(`icon for ${FIRMA.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for FIRMA is to redeem it
        expect(screen.getByTitle('Toggle Redeem FIRMA')).toBeEnabled();

        // The redeem button is disabled on load
        const redeemButton = await screen.findByRole('button', {
            name: /Redeem FIRMA for XEC/,
        });
        expect(redeemButton).toBeDisabled();

        // We do not see a price input
        expect(
            screen.queryByPlaceholderText('Enter list price (per token)'),
        ).not.toBeInTheDocument();

        // We do not see a min qty input
        expect(
            screen.queryByPlaceholderText('Min qty'),
        ).not.toBeInTheDocument();

        // Enter amount to redeem
        await userEvent.type(
            screen.getByPlaceholderText('Offered qty'),
            '0.009',
        );

        // This is below firma min redemption so we get an error
        expect(
            screen.getByText('Cannot redeem less than 0.01 FIRMA'),
        ).toBeInTheDocument();

        // The redeem button is still disabled
        expect(redeemButton).toBeDisabled();

        // OK we redeem more than dust
        await userEvent.clear(screen.getByPlaceholderText('Offered qty'));

        await userEvent.type(screen.getByPlaceholderText('Offered qty'), '10');

        expect(screen.getByPlaceholderText('Offered qty')).toHaveValue('10');

        // The redeem button is now enabled
        expect(redeemButton).toBeEnabled();

        // Redeem
        await userEvent.click(redeemButton);

        // Price error
        // We see an error notification for no price
        expect(
            await screen.findByText(/Error determining FIRMA bid price:/),
        ).toBeInTheDocument();
        // We never see the modal
        expect(
            screen.queryByText('Create the following sell offer?'),
        ).not.toBeInTheDocument();
    });
});
