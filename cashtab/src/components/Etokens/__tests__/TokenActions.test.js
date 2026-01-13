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
import { FEE_SATS_PER_KB_CASHTAB_LEGACY } from 'constants/transactions';
import {
    tokenTestWallet,
    supportedTokens,
    slp1FixedMocks,
    slp1VarMocks,
    alpMocks,
    slpMintVaultMocks,
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
import {
    FIRMA,
    FIRMA_REDEEM_ADDRESS,
    XECX_SWEEPER_ADDRESS,
} from 'constants/tokens';

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

        // Mock settings to use higher fee rate (2010) for this test
        await localforage.setItem('settings', {
            fiatCurrency: 'usd',
            sendModal: false,
            autoCameraOn: false,
            hideMessagesFromUnknownSenders: false,
            balanceVisible: true,
            satsPerKb: FEE_SATS_PER_KB_CASHTAB_LEGACY, // Use legacy fee rate for this test
        });

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
            '0200000002666de5d5852807a13612b6ea0373643266d435822daeb39c29e5d4b67e893cda01000000644108ad939e758acd4026cd238ac32fe4c5da6603f758a7505499cdae722aaa55222d5c7725e03df18868e1e7907eb4d5f58caac8e3e598438c53944f5eb4aeef614121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf79261803000000644194960978e57be3096175e51d74152b9bf4a42f23006395a11744f6102f694827901fc514499002d94c2496eaaa3dd9b7002c85cb6c56fa05d7f7180c3797fdd84121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000019d81d9600060500000000000017a91472065f43eb5358b84763ecf40440d0fc9914e6c887a4300f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const adPrepTxid =
            'b5c78fbd15cb32f3ff62cd0547d75bc8b9a3f058930440232a7eaf871e992543';
        mockedChronik.setBroadcastTx(adPrepHex, adPrepTxid);

        // SLP1 ad list
        const adListHex =
            '02000000014325991e87af7e2a2340049358f0a3b9c85bd74705cd62fff332cb15bd8fc7b501000000dd0441475230075041525449414c41bc63a21aa4f4a7cbb56202ed3e0618e5f4c0b4f6befcf27b8bb73e5492c432dea1e47b50d7f9db5cabfc7cca2144695beaf90f2e98b32027f246d80016df2139414c8c4c766a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f8080000000000000000000024d6f304000000006fb0ad0e3cc701000078e4b2601aaf0c2099c53f031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d01557f77ad075041525449414c88044147523087ffffffff020000000000000000376a04534c500001010453454e442020a0b9337a78603c6681ed2bc541593375535dcd9979196620ce71f233f2f6f80800000019d81d9600220200000000000017a91483a664c10582186f7dd3607b068770eb972b441b8700000000';
        const adListTxid =
            '843aa040c6247e515e4224971adf9bc443bf97553de3b22d0e357c360f76851a';
        mockedChronik.setBroadcastTx(adListHex, adListTxid);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '83a664c10582186f7dd3607b068770eb972b441b';

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
        expect(await screen.findAllByText(new RegExp(tokenName))).toHaveLength(
            3,
        );

        // Token image is rendered
        expect(
            screen.getByAltText(`icon for ${slp1FixedMocks.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(await screen.findByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for SLP is to list it
        expect(await screen.findByTitle('Toggle Sell Token')).toBeEnabled();

        // The list button is disabled on load
        const listButton = await screen.findByRole('button', {
            name: /List Vespene Gas/,
        });

        await waitFor(() => expect(listButton).toBeDisabled());

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
        expect(minQtyInput).toHaveValue(5460);

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
        expect(minQtyInput).toHaveValue(5460);

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
        expect(await screen.findByText('List VSP?')).toBeInTheDocument();
        expect(
            screen.getByText('Create the following sell offer?'),
        ).toBeInTheDocument();
        // Offered qty (actual, calculated from AgoraOffer)
        const actualOfferedQty = '111.000000000';
        expect(screen.getByText(actualOfferedQty)).toBeInTheDocument();
        // Min by (actual, calculated from AgoraOffer)
        expect(screen.getByText('11.000000000')).toBeInTheDocument();
        const userInputPricePerToken = '1.6667 XEC';
        // Actual price calculated from AgoraOffer
        const actualPricePerToken = '1.6609 XEC';
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
    it('We can correctly render an SLP1 NFT Parent token with no ready NFT Mint inputs, then mint an NFT as ecash-wallet will automatically prepare them', async () => {
        // We expect two txids; a fan-out to prep the qty-1 input, and the nft mint itself
        const inputPrepTxHex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064410fab6ef8735fb6b1cfa3378f4a366b691e76f90ab94bce16a5166e27c2a6bcc28764c4b4292fea1fd1da9488b12d9b1a41085ed10b52ed6f77143e0700c818d54121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffcc04a35686950a66845ebf8e37677fffcc5ee0e2b63e3f05822838273149660c010000006441a9ce59a39fd5098bf9220cc9d618723d1b3a5c78f3963dd5c6dfc8811392243cf859b7f148fb1ef523ae927b41f75cee4e3a3373a7f350eef8d61f3ba91fd06a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001810453454e44200c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc08000000000000000108000000000000006322020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ace4320f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const inputPrepTxTxid =
            '0c14ee8ab4b87c194d08acd3dd35cf18fba16cfbed8ca12a20310303dce15d5d';
        const mintTxHex =
            '02000000025d5de1dc030331202aa18cedfb6ca1fb18cf35ddd3ac084d197cb8b48aee140c0100000064419ea499208393534e59f9e4a822aa1d65be2bd072911e5e52a15c78cab14f3eac337e54dec29e1e64c94471ee93e91438501436c5c6e2fc5418c1fe2a5de15c034121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff5d5de1dc030331202aa18cedfb6ca1fb18cf35ddd3ac084d197cb8b48aee140c030000006441200390360da6321753362bfdfee4300aa3640f09d3512a91e235c4e4f8f72a43d3ea87eab57657d32234ab7dc3742cab2b86efe727f47ef385cd4a8166c6bc2a4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0300000000000000003c6a04534c500001410747454e4553495304414243310b426974636f696e204142430b636173687461622e636f6d4c0001004c0008000000000000000122020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac852f0f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const mintTxid =
            '72eabc5266341dc296c91d29236056f1281cb0bfd223c004530ec35bfcd7bb12';
        mockedChronik.setBroadcastTx(inputPrepTxHex, inputPrepTxTxid);
        mockedChronik.setBroadcastTx(mintTxHex, mintTxid);
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

        // The mint NFT option is available
        expect(screen.getByTitle('Toggle Mint NFT')).toBeInTheDocument();

        // The mint NFT option is enabled even if there are no qty-1 utxos aka mint inputs
        expect(screen.getByTitle('Toggle Mint NFT')).toBeEnabled();

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
        expect(screen.getByRole('button', { name: /Mint NFT/ })).toBeEnabled();

        await userEvent.click(screen.getByRole('button', { name: /Mint NFT/ }));

        // We see a preview modal, click OK
        await userEvent.click(screen.getByText('OK'));

        // We see expected toast notification
        expect(await screen.findByText('NFT Minted!')).toBeInTheDocument();
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
            '0200000002333333333333333333333333333333333333333333333333333333333333333301000000644104a08779920c87d1609a7f6288b92fb7cd35a9733929f3c4340269cb0ef597287441228ca8d07cde105ad18567543564e70389894e5e75cc843f53ec0c8e52294121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441f93b66b4fd23fb34139d1862574a62ccb9fa8ef43e8b38a1e3dd73d88ca10d2d3a45165ee2d2df870e6e6c2d0527c052919b4cbe3f4f32b48ededc8048d7a4014121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0300000000000000003c6a04534c500001410747454e4553495304414243310b426974636f696e204142430b636173687461622e636f6d4c0001004c0008000000000000000122020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac7a330f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'c251be21a0f158ea097512a818f455ee941822515fa0240e781ee56d27b5d4d4';

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

        // The mint NFT option is available
        expect(screen.getByTitle('Toggle Mint NFT')).toBeInTheDocument();

        // The mint NFT option is NOT disabled as we have a single mint input
        expect(screen.getByTitle('Toggle Mint NFT')).toBeEnabled();

        // The mint NFT switch label does not include the disabled explanation
        expect(
            screen.queryByText('(no NFT mint inputs)'),
        ).not.toBeInTheDocument();

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
        mockedAgora.setActiveOffersByPubKey(tokenTestWallet.pk, []);

        // activeOffersByGroupTokenId does not need to be mocked since there are no offers here

        // NFT ad prep
        const adPrepHex =
            '0200000002268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d01000000644153d568d4f1afea6e10068401b694dd0e35ab06ba23598d5b468cdbc296c3010ca2c957a760cffce58f80f500d7fd7ecc5b60b18e7fb4ccc6dc88b160bef03a934121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441efd3918c6f1144aae8526a1c43d5e5db6326e6517ff619d47bad3cd101cec46339f8be5b5ee2d9dc3edcac5cc098a2b30b25835436ce26cb0c7012c8f02c4fa24121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a22283260800000000000000019a0400000000000017a914015ae7701f0136acdba7575bd99ddc49a3cbb86f8710310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const adPrepTxid =
            '7584f9f4b945c43b4fb36c710c4b5567c5f9f65cdcea3b876a3bb559ea0dccea';
        mockedChronik.setBroadcastTx(adPrepHex, adPrepTxid);

        // NFT ad list
        const adListHex =
            '0200000001eacc0dea59b53b6a873beadc5cf6f9c567554b0c716cb34f3bc445b9f4f9847501000000a70441475230074f4e4553484f544104e11374000158db447ce295543fad52d58c06b6f9faa1a5c2d6fb6700c2e301a7d68946be96854bb94eddee61a33ede3c34a1db02864b590db1e8720928ae83414c56222b50fe00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac7521031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dad074f4e4553484f5488044147523087ffffffff020000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326080000000000000001220200000000000017a91439efc3f04274f0c42057c67ac1b14d8305ed5ec18700000000';
        const adListTxid =
            'df74bd7ff190f4a45b8bf13216e03d95ae21d5c071d0aba3f5edbcf9e219338c';
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
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441fe33e6612eb70a5071694ea98e4beb96047624852ce0bb430b6c79d5a03328f6f61d2af55e62310ed4d84402e6fc911170d979f28da258af20c526703c4307a14121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d0100000064411c49ae23798d7cc3d7efd6bc1ad645d147a0964c104f72d6b0c9f9cfe0e551faeb1a4ab4591c871972d9e9881eb7aa7875c9de29cefd34e907e3ae38209152b54121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a222832608000000000000000122020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac84330f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            'ed3f4387746c06139952133f447dd49208e892ec1c69efc02b03d553fd1f0498';
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
        await waitFor(() => expect(sellActionSwitch).toBeChecked());

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
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064414699e8f1772d29a83fd575d2e9de0db228e6cfa9b5ddc47ab63f76c653d995c6fedad8fe529bb0bf0f9a787904ea772d235145730e100620fb8ce846afe2da0f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441de3e281095d82b58eca96ca9491c02bbc96e3e46f895521366059786ad19630030f16162e29f607af2a5bbda0918aa3d3cb03a44f2055448b6174b97c25ed6ab4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff0400000000000000003a6a5037534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c02102700000000301b0f00000022020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac18310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '8e0ec6625fcef4af4255c6aed6177833cfcb1ef8364a51fbf2b62e9f46975015';
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

        const sendTokenSuccessNotification =
            await screen.findByText('eToken sent');
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
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441c0e932e98692f1996fed9ed7927aa2935a80f1a05833b509effd4f028a57ff38e21fc2debb708d72ef2f7f02b63b013d8d51c63000437b3f47f3947d8d55af0f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441e5f9666927dd91d351dee5e5f12aeb4ae1319f918e50ac985b1bc3c6366c0beba7204005ddee8397214d7c503718a9ce734c06f48cafc8b76b9ef85982e523654121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000656a5030534c503200044255524e49884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c10270000000031534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c01301b0f00000022020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac28330f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '239ad6cadc7115ef3e5ff5ebb3b4367767d1dee587b2ed430e8f1238ed8022cc';
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

        const burnTokenSuccessNotification =
            await screen.findByText('🔥 Burn successful');
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
            '020000000188bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441088e3fd03897d61fc518539ef16bdb588b1642d9833dce601ae2e56573c50500e98f6688453c095a1b121bf5bb28b5d9d91d0fed3130e0ea64f570f0ff4315f04121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff010000000000000000336a5030534c503200044255524e49884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c40420f00000000000000';
        const txid =
            'd286a936a9303aaaaa44d8311f9792f517fe572ea1b6076862874fed31040f71';
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

        const burnTokenSuccessNotification =
            await screen.findByText('🔥 Burn successful');
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
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441f53918597a4599cea5768c8701083d9b24ca6035918deec541e8015121efdd1fa2e04f0e13a90549cfe75e0148c809b3a92b4c89be743b05e8b24ff393a2f80f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25020000006441ad04cf7ab4c166f1d7cdda8de6805c3e6384b4edf4833dfbdc0f6f1bcf5d0e7a01eedcf0f55e7d2072c779c7cdb6445c09a0f009f5445499aed92ddbe64ae80b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000356a5032534c503200044d494e5449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c01ffffffffffff0122020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '7fd6bb7637487767a6bbc999ed6b395e8a0354b064428a6b1beef15270ef7434';
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
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064416c62d7bac78b198003608e4aae58c9ec0c10f85192f0cd53c4f29b439c00bd410719503b7d5c57614635a0eed7f547e10e84979976f026b1572610af593b21a24121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441f83e8cd21adc559b6a6c624566f7028676022a327f0cdaa71c0f7252bf9f90de5b47d3f465270aac63188c747457d08d670c90433955a4fe37e4f467989710c84121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000806a504b41475230075041525449414c00002eee837863080000c3f51ad354320000e0e487a193ad47012099c53f031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d31534c5032000453454e4449884c726ebb974b9b8345ee12b44cc48445562b970f776e307d16547ccdd77c0140420f000000220200000000000017a9141803a62d179c74adb3568dccfd71712690f6ebd287f6320f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const offerTxid =
            'd0afc76c61582ea19db3100958c1e583b8d0a98fb4046af3fb44a85e76c26c21';
        mockedChronik.setBroadcastTx(offerHex, offerTxid);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '1803a62d179c74adb3568dccfd71712690f6ebd2';

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
        const listButton = await screen.findByRole('button', {
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
        expect(minQtyInput).toHaveValue(5460);

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
        expect(await screen.findByText('List tCRD?')).toBeInTheDocument();
        expect(
            screen.getByText('Create the following sell offer?'),
        ).toBeInTheDocument();
        // Offered qty (actual, calculated from AgoraOffer)
        const actualOfferedQty = '100.0000';
        expect(screen.getAllByText(actualOfferedQty)).toHaveLength(2);
        // Min buy (actual, calculated from AgoraOffer)
        expect(screen.getByText('1.0000')).toBeInTheDocument();
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
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441338c58600f2e17d0d960855cd4c7c53064d0f7013605b1f5e1d051275f8c76aad64f9745fe3c19d947ac79726620ba8ec18fe7eebd12e3e86bd93d17f30d7fe24121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441031c4dcb7fea6c8f947e2534c24ea9f60e55879cd2a403355797681ee3c6944c8535e3576aeefb99c365033be5132bbcc731b1a9368623b074a930fa9e2fc69e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000806a504b41475230075041525449414c00002a9e437b630800002a9e437b63080000805e24849cf7ff7f2099c53f031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d31534c5032000453454e44d44ecf795494b063aa10be876868880df8ef822577c1a546fb1cd9b6c2f57bc60140420f000000220200000000000017a9146bb29d3d6088183f80fceb07bd5e203f166d954687f6320f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const offerTxid =
            '781fde086adc3894b783698e7732e662bef9aec345facbd57422e1b3e9f13201';
        mockedChronik.setBroadcastTx(offerHex, offerTxid);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '6bb29d3d6088183f80fceb07bd5e203f166d9546';

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
        expect(await screen.findByTitle('Toggle Redeem XECX')).toBeEnabled();

        // The redeem button is disabled on load
        const redeemButton = await screen.findByRole('button', {
            name: /Redeem XECX for XEC/,
        });

        await waitFor(() => expect(redeemButton).toBeDisabled());

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

        expect(screen.getByPlaceholderText('Offered qty')).toHaveValue(10000);

        // The redeem button is now enabled
        expect(redeemButton).toBeEnabled();

        // The fiat price is previewed correctly
        expect(
            screen.getByText('1 XEC ($0.00003000 USD) per token'),
        ).toBeInTheDocument();

        // Redeem
        await userEvent.click(redeemButton);

        // We see expected confirmation modal to list the Token
        expect(
            await screen.findByText('Redeem 10,000.00 XECX?'),
        ).toBeInTheDocument();
        expect(screen.getByText('You receive:')).toBeInTheDocument();
        expect(screen.getByText('10,000.00 XEC')).toBeInTheDocument();

        // We can cancel and not create this auto-redeem listing
        await userEvent.click(screen.getByText('Cancel'));

        // The confirmation modal is gone
        expect(
            screen.queryByText('Redeem 10,000.00 XECX?'),
        ).not.toBeInTheDocument();

        // We change our mind and list it
        await userEvent.click(redeemButton);

        expect(
            await screen.findByText('Redeem 10,000.00 XECX?'),
        ).toBeInTheDocument();
        await userEvent.click(screen.getByText('OK'));

        // We see the expected toast notification for the successful listing tx
        expect(
            await screen.findByText(
                `10,000.00 Staked XEC listed for 1 XEC per token`,
            ),
        ).toBeInTheDocument();
    });
    it('We see expected alert in XECX redemption workflow for hot wallet balance', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // Mock a balance of 9.99k XEC in the hot wallet
        mockedChronik.setUtxosByAddress(XECX_SWEEPER_ADDRESS, [
            { sats: 9_999_00n },
        ]);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '6bb29d3d6088183f80fceb07bd5e203f166d9546';

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
        const redeemButton = await screen.findByRole('button', {
            name: /Redeem XECX for XEC/,
        });

        await waitFor(() => expect(redeemButton).toBeDisabled());

        // We redeem 10k XECX
        await userEvent.type(
            screen.getByPlaceholderText('Offered qty'),
            '10000',
        );

        expect(screen.getByPlaceholderText('Offered qty')).toHaveValue(10000);

        // The redeem button is now enabled
        expect(redeemButton).toBeEnabled();

        // The fiat price is previewed correctly
        expect(
            screen.getByText('1 XEC ($0.00003000 USD) per token'),
        ).toBeInTheDocument();

        // Redeem
        await userEvent.click(redeemButton);

        // We see expected confirmation modal to list the Token
        expect(
            await screen.findByText('Redeem 10,000.00 XECX?'),
        ).toBeInTheDocument();
        expect(screen.getByText('You receive:')).toBeInTheDocument();
        expect(screen.getByText('10,000.00 XEC')).toBeInTheDocument();

        // We see the hot wallet alert
        expect(
            screen.getByText(
                '⚠️ XECX redemption larger than hot wallet balance of 10k XEC. Execution may take up to 24 hours.',
            ),
        ).toBeInTheDocument();
    });
    it('We DO NOT see expected alert in XECX redemption workflow for hot wallet balance if there is some error determining the hot wallet balance', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // Mock a balance of 9.99k XEC in the hot wallet
        mockedChronik.setUtxosByAddress(
            XECX_SWEEPER_ADDRESS,
            new Error('we do not get the balance'),
        );

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '6bb29d3d6088183f80fceb07bd5e203f166d9546';

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
        const redeemButton = await screen.findByRole('button', {
            name: /Redeem XECX for XEC/,
        });

        await waitFor(() => expect(redeemButton).toBeDisabled());

        // We redeem 10k XECX
        await userEvent.type(
            screen.getByPlaceholderText('Offered qty'),
            '10000',
        );

        expect(screen.getByPlaceholderText('Offered qty')).toHaveValue(10000);

        // The redeem button is now enabled
        expect(redeemButton).toBeEnabled();

        // The fiat price is previewed correctly
        expect(
            screen.getByText('1 XEC ($0.00003000 USD) per token'),
        ).toBeInTheDocument();

        // Redeem
        await userEvent.click(redeemButton);

        // We see expected confirmation modal to list the Token
        expect(
            await screen.findByText('Redeem 10,000.00 XECX?'),
        ).toBeInTheDocument();
        expect(screen.getByText('You receive:')).toBeInTheDocument();
        expect(screen.getByText('10,000.00 XEC')).toBeInTheDocument();

        // We see the hot wallet alert
        expect(
            screen.queryByText(
                '⚠️ XECX redemption larger than hot wallet balance of 10k XEC. Execution may take up to 24 hours.',
            ),
        ).not.toBeInTheDocument();
    });
    it('We can redeem 1 Firma for $1 of XEC using a workflow unique to Firma', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // Mock a bid price
        when(fetch)
            .calledWith(`https://firmaprotocol.com/api/bid`)
            .mockResolvedValue({
                json: () => Promise.resolve({ bid: 40000.0 }),
            });

        // Mock a hot wallet balance for FIRMA_REDEEM_WALLET
        mockedChronik.setUtxosByAddress(FIRMA_REDEEM_ADDRESS, [
            { sats: 1_000_000_00n },
        ]);

        // FIRMA offer tx
        const offerHex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441073b92e8a0e327b928b1624d876c3a697cc1c77c27457c8d2c3591b3b0a9d4587401b8dc64f3ebacd3b75598a18cdc36fd82b1e3b3b11b7340db76e66713c6a04121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff88bb5c0d60e11b4038b00af152f9792fa954571ffdd2413a85f1c26bfd930c25010000006441acecbcb82f72ad54a09e166deb28a22ca22edff2317d388ef7bcefe8a4e11827fc1d57e34f23fa5b5f2b22accc0185a01619b933d8821bdd184e8c6179a4de664121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000866a504b41475230075041525449414c0000705e00d6e2530000f41ee5af3500000000a61950caffff7f2099c53f031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d37534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f94870302a08601000000a0bb0d000000220200000000000017a91412b672fccd4a0202fe588746b3c0aba2b77cfb2e8722020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac83300f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const offerTxid =
            '038fb0787b3deeff0b8785430ac4d63fdb263eaa4869b6082a0eb10901a37005';
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
        const EXPECTED_OFFER_P2SH = '12b672fccd4a0202fe588746b3c0aba2b77cfb2e';

        // We mock no existing utxos
        mockedChronik.setUtxosByScript('p2sh', EXPECTED_OFFER_P2SH, []);

        // Note that we cannot use mockedAgora to avoid agoraQueryErrors, as we need a proper
        // agora object to build the partial
        // This means we cannot mock firma offers in the OrderBook for this test
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
            await screen.findByAltText(`icon for ${FIRMA.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for FIRMA is to redeem it
        expect(screen.getByTitle('Toggle Redeem FIRMA')).toBeEnabled();

        // The redeem button is disabled on load
        const redeemButton = await screen.findByRole('button', {
            name: /Redeem FIRMA for XEC/,
        });

        await waitFor(() => expect(redeemButton).toBeDisabled());

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

        expect(screen.getByPlaceholderText('Offered qty')).toHaveValue(10);

        // The redeem button is now enabled
        expect(redeemButton).toBeEnabled();

        // Redeem
        await userEvent.click(redeemButton);

        // Async as we must wait for multiple partials
        expect(
            await screen.findByText('Redeem $FIRMA for XEC?'),
        ).toBeInTheDocument();

        // Offered qty (actual, calculated from AgoraOffer)
        const actualOfferedQty = '10.0000';

        expect(
            screen.getByText(`${actualOfferedQty} $FIRMA`),
        ).toBeInTheDocument();
        // Actual price calculated from AgoraOffer
        const actualPricePerTokenForMinBuy = '40,000.00 XEC';
        // We see the price once; it is not previewed as we need to calculate it before we
        // show the modal
        expect(
            screen.getByText(actualPricePerTokenForMinBuy),
        ).toBeInTheDocument();
        // We see the full receive XEC amount
        expect(screen.getByText('You receive:')).toBeInTheDocument();
        expect(screen.getByText('400,000.01 XEC')).toBeInTheDocument();

        // We can cancel and not create this listing
        await userEvent.click(screen.getByText('Cancel'));

        // The confirmation modal is gone
        expect(
            screen.queryByText('Redeem $FIRMA for XEC?'),
        ).not.toBeInTheDocument();

        // We change our mind and list it
        await userEvent.click(redeemButton);

        expect(
            await screen.findByText('Redeem $FIRMA for XEC?'),
        ).toBeInTheDocument();
        await userEvent.click(screen.getByText('OK'));

        // We see the expected toast notification for the successful listing tx
        expect(
            await screen.findByText(
                `${actualOfferedQty} Firma listed for ${actualPricePerTokenForMinBuy} per token`,
            ),
        ).toBeInTheDocument();
    });
    it('FIRMA redeem is disabled if the hot wallet cannot cover redeem amount', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // Mock a bid price
        when(fetch)
            .calledWith(`https://firmaprotocol.com/api/bid`)
            .mockResolvedValue({
                json: () => Promise.resolve({ bid: 40000.0 }),
            });

        // Mock a hot wallet balance for FIRMA_REDEEM_WALLET
        mockedChronik.setUtxosByAddress(FIRMA_REDEEM_ADDRESS, [
            { sats: 1_000_00n },
        ]);

        // Make sure FIRMA is cached
        mockedChronik.setTx(FIRMA.tx.txid, FIRMA.tx);
        mockedChronik.setToken(FIRMA.tokenId, FIRMA.token);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '12b672fccd4a0202fe588746b3c0aba2b77cfb2e';

        // We mock no existing utxos
        mockedChronik.setUtxosByScript('p2sh', EXPECTED_OFFER_P2SH, []);

        // Note that we cannot use mockedAgora to avoid agoraQueryErrors, as we need a proper
        // agora object to build the partial
        // This means we cannot mock firma offers in the OrderBook for this test
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
            await screen.findByAltText(`icon for ${FIRMA.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for FIRMA is to redeem it
        expect(screen.getByTitle('Toggle Redeem FIRMA')).toBeEnabled();

        // The redeem button is disabled on load
        const redeemButton = await screen.findByRole('button', {
            name: /Redeem FIRMA for XEC/,
        });

        await waitFor(() => expect(redeemButton).toBeDisabled());

        // We do not see a price input
        expect(
            screen.queryByPlaceholderText('Enter list price (per token)'),
        ).not.toBeInTheDocument();

        // We do not see a min qty input
        expect(
            screen.queryByPlaceholderText('Min qty'),
        ).not.toBeInTheDocument();

        // Enter amount to redeem
        await userEvent.type(screen.getByPlaceholderText('Offered qty'), '10');

        // The redeem button is now enabled
        expect(redeemButton).toBeEnabled();

        // Redeem
        await userEvent.click(redeemButton);

        // Async as we must wait for multiple partials
        expect(
            await screen.findByText('Redeem $FIRMA for XEC?'),
        ).toBeInTheDocument();

        // Offered qty (actual, calculated from AgoraOffer)
        const actualOfferedQty = '10.0000';

        expect(
            screen.getByText(`${actualOfferedQty} $FIRMA`),
        ).toBeInTheDocument();
        // Actual price calculated from AgoraOffer
        const actualPricePerTokenForMinBuy = '40,000.00 XEC';
        // We see the price once; it is not previewed as we need to calculate it before we
        // show the modal
        expect(
            screen.getByText(actualPricePerTokenForMinBuy),
        ).toBeInTheDocument();
        // We see the full receive XEC amount
        expect(screen.getByText('You receive:')).toBeInTheDocument();
        expect(screen.getByText('400,000.01 XEC')).toBeInTheDocument();

        // We see an alert as the hot wallet cannot cover this redemption
        expect(
            screen.getByText(
                'Cannot redeem more than 1,000.00 XEC worth of $FIRMA. Visit firma.cash to redeem for $USDT.',
            ),
        ).toBeInTheDocument();

        // Redeem is disabled
        const redeemBtnModal = screen.getByRole('button', {
            name: /OK/,
        });
        expect(redeemBtnModal).toBeDisabled();
    });
    it('We show expected error if we are unable to get FIRMA bid price from API', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // Mock a bid price
        when(fetch)
            .calledWith(`https://firmaprotocol.com/api/bid`)
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
            await screen.findByAltText(`icon for ${FIRMA.tokenId}`),
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

        expect(screen.getByPlaceholderText('Offered qty')).toHaveValue(10);

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
    it('We can SEND or BURN an SLP MINT VAULT token', async () => {
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        // It's not listed yet
        mockedAgora.setActiveOffersByTokenId(slpMintVaultMocks.tokenId, []);

        // MINT VAULT send
        const hex =
            '0200000002ef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441bd412de68ed26d6e038e04ac4974000106c916c122d5a6c4aa6458317100d43a1d3184906286d3286b9dd74c712b868e3668966c6edf9719c1fc844b7ea2a9634121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffe227ad0b23242a4678fc79104cdf1c80914862a3c808066aebc65ef35b52b56f01000000644105d8ab490001c5822f7afdd59f6051a2b2ea6100bf7e38e936c1724970e413c265e10b0b4fabdc66ccc1da89709e46020f008ccb4007c653cd888437e27bf8514121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001020453454e44208ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba325108000000000000000108000000000001869f22020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac0c310f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const txid =
            '183cda9bc36776610c3a304365b0e4fe76116e0f97bf99197df4de179e779ca6';
        mockedChronik.setBroadcastTx(hex, txid);

        // MINT VAULT burn
        const burnPrepHex =
            '0200000002e227ad0b23242a4678fc79104cdf1c80914862a3c808066aebc65ef35b52b56f0100000064413c32f0ee85ed4cb443a208f912d4a89f8144bd181b711eb6c1dd027dd5aef763015d7c679d68515e5f84dfeaf0db0f3908f8e291ff542a090b1f2c909d484d774121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffa69c779e17def47d1999bf970f6e1176fee4b06543303a0c617667c39bda3c180300000064415c93463a7209c0657c40540827006a004157440eeb1dc85f6dea8414328e41e6048b46d7bde463b0e08438ffc183a002aab5a3e6dcb22eb7a5cb4d16bf4279b24121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001020453454e44208ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba325108000000000000000108000000000001869f22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac22020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac172d0f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const burnPrepTxid =
            'd1c3eea6b7e8fb4ca0aa2f4924339a0c7aa2a78a44893f58a80cb8e9c77965fe';
        mockedChronik.setBroadcastTx(burnPrepHex, burnPrepTxid);

        const burnTxHex =
            '0200000001fe6579c7e9b80ca8583f89448aa7a27a0c9a3324492faaa04cfbe8b7a6eec3d1010000006441757af17354e6c5d71b467985fe81eca9a81f79aae8feeb9eddbd838e76f097965d8c5eb311ed047111c52a63890cc1d2fd7325c727b6f5d123d0246bd8a07d1b4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff010000000000000000376a04534c50000102044255524e208ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba325108000000000000000100000000';
        const burnTxTxid =
            '3014c90880d76da7e780bf791693dced0e1f0c8130d5bf50782adcca20ed349c';
        mockedChronik.setBroadcastTx(burnTxHex, burnTxTxid);

        // Mock NOT blacklisted
        when(fetch)
            .calledWith(
                `${tokenConfig.blacklistServerUrl}/blacklist/${slpMintVaultMocks.tokenId}`,
            )
            .mockResolvedValue({
                json: () => Promise.resolve({ isBlacklisted: false }),
            });

        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
                agora={mockedAgora}
                ecc={ecc}
                route={`/send-token/${slpMintVaultMocks.tokenId}`}
            />,
        );

        const { tokenName } = slpMintVaultMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // Wait for supply and actions to load
        // The supply is correctly rendered and is variable for a MINT VAULT token even though
        // we have no mint batons
        expect(
            await screen.findByText('10,000,000 (var.)'),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for SLP MINT is to list it
        expect(screen.getByTitle('Toggle Sell Token')).toBeChecked();

        // Click Send
        const sendActionSwitch = screen.getByTitle('Toggle Send');
        await userEvent.click(sendActionSwitch);
        await waitFor(() => expect(sendActionSwitch).toBeChecked());

        // Wait for address input to render
        expect(
            await screen.findByPlaceholderText('Address'),
        ).toBeInTheDocument();

        // We see an Address input
        const addrInput = screen.getByPlaceholderText('Address');
        expect(addrInput).toBeInTheDocument();

        // Send button is disabled before address and amount entry
        const sendButton = screen.getByRole('button', {
            name: /Send MVTT β/,
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

        // We can send an SLP MINT VAULT token
        await userEvent.click(sendButton);

        const sendTokenSuccessNotification =
            await screen.findByText('eToken sent');
        expect(sendTokenSuccessNotification).toHaveAttribute(
            'href',
            `${explorer.blockExplorerUrl}/tx/${txid}`,
        );

        // We can also burn an SLP MINT VAULT token

        // Select burn
        await userEvent.click(screen.getByTitle('Toggle Burn'));

        await userEvent.type(screen.getByPlaceholderText('Burn Amount'), '1');

        // Click the Burn button
        // Note we button title is the token ticker
        await userEvent.click(
            await screen.findByRole('button', { name: /Burn MVTT β/ }),
        );

        // We see a modal and enter the correct confirmation msg
        await userEvent.type(
            screen.getByPlaceholderText(`Type "burn MVTT β" to confirm`),
            'burn MVTT β',
        );

        // Click the Confirm button
        await userEvent.click(screen.getByRole('button', { name: /OK/ }));

        const burnTokenSuccessNotification =
            await screen.findByText('🔥 Burn successful');
        await waitFor(() =>
            expect(burnTokenSuccessNotification).toHaveAttribute(
                'href',
                `${explorer.blockExplorerUrl}/tx/${burnTxTxid}`,
            ),
        );
    });
    it('We can list a MINT VAULT fungible token', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // MINT VAULT offer tx
        // NB SLP listings require 2 txs
        const adPrepHex =
            '0200000002e227ad0b23242a4678fc79104cdf1c80914862a3c808066aebc65ef35b52b56f010000006441fc83448f28fcb4bb1fb4967eefa0f040bceac9396f46ca77e60c0a27c8793a2f859a8f03befe6bcf1eac0ba0222437f829357739cd1dd87cefd5583eb00914824121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441bd4e2abc96788d82cc7cd14315067d655d98df10f1192a36b65142243afbf507f6317e96a2f661e2602b9a0f54f654ea9df476f344df952ef9526520c6f4053c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff040000000000000000406a04534c500001020453454e44208ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba325108000000000000006408000000000001863c060500000000000017a9143372e00e99d216de6ef5d3f5b6e527537bac02fc8722020000000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac2c2e0f00000000001976a9143a5fb236934ec078b4507c303d3afd82067f8fc188ac00000000';
        const adPrepTxid =
            'b327dc0c6f28e4c6261503b5b97cb2f18e98ef58858d01829632026773d00b76';
        mockedChronik.setBroadcastTx(adPrepHex, adPrepTxid);

        const offerHex =
            '0200000001760bd0736702329682018d8558ef988ef1b27cb9b5031526c6e4286f0cdc27b301000000dd0441475230075041525449414c412dfb61446336a507b47e268a77e75ba76f18df19933b3dfa18847417df02e11205f8209934789047625e4ccea40b06b9296047480f627f2cec4a3e6ce18f00eb414c8c4c766a04534c500001020453454e44208ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba32510800000000000000000000b7ec10ffb0a5470135a6d4e3c64603004a8c65fa25e2ad072099c53f031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02d01557f77ad075041525449414c88044147523087ffffffff020000000000000000376a04534c500001020453454e44208ecb9c25978f429472f3e9f9c048222f6ac9977e7d1313781f0e9ac1bdba3251080000000000000064220200000000000017a914e219eaeb3198314f300f2e168d86a20ff2b90dd18700000000';
        const offerTxid =
            '283ce5f963cfaf66ac549b77ea354922cd5af5d6f0d4fc31416c9ed61b4264fd';
        mockedChronik.setBroadcastTx(offerHex, offerTxid);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = 'e219eaeb3198314f300f2e168d86a20ff2b90dd1';

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
                route={`/send-token/${slpMintVaultMocks.tokenId}`}
            />,
        );

        const { tokenName } = slpMintVaultMocks.token.genesisInfo;

        // Wait for element to get token info and load
        expect(
            (await screen.findAllByText(new RegExp(tokenName)))[0],
        ).toBeInTheDocument();

        // Token image is rendered
        expect(
            screen.getByAltText(`icon for ${slpMintVaultMocks.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for MINT vault is to list it
        expect(screen.getByTitle('Toggle Sell Token')).toBeEnabled();

        // The list button is disabled on load
        const listButton = await screen.findByRole('button', {
            name: /List Mint Vault Test Token Beta/,
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
        await userEvent.type(priceInput, '1');

        const minQtyInput = screen.getByPlaceholderText('Min qty');

        // The quantity updates automatically
        expect(minQtyInput).toHaveValue(6);

        // The list button is no longer disabled
        expect(listButton).toBeEnabled();

        // Click the now-enabled list button
        await userEvent.click(listButton);

        // We see expected confirmation modal to list the Token
        expect(await screen.findByText('List MVTT β?')).toBeInTheDocument();
        expect(
            screen.getByText('Create the following sell offer?'),
        ).toBeInTheDocument();
        // Offered qty (actual, calculated from AgoraOffer)
        const actualOfferedQty = '100';
        expect(screen.getByText(actualOfferedQty)).toBeInTheDocument();
        // Min buy (actual, calculated from AgoraOffer)
        expect(screen.getByText('6')).toBeInTheDocument();
        // Actual price calculated from AgoraOffer
        const actualPricePerTokenForMinBuy = '1.0017 XEC';
        expect(
            screen.getAllByText(actualPricePerTokenForMinBuy)[0],
        ).toBeInTheDocument();

        // We pull the trigger
        await userEvent.click(screen.getByText('OK'));

        // We see the expected toast notification for the successful listing tx
        expect(
            await screen.findByText(
                `${actualOfferedQty} Mint Vault Test Token Beta listed for ${actualPricePerTokenForMinBuy} per token`,
            ),
        ).toBeInTheDocument();
    });
    it('We do not allow users to list FIRMA below the bid price', async () => {
        // Mock Math.random()
        jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // set a fixed value

        // Mock a bid price
        when(fetch)
            .calledWith(`https://firmaprotocol.com/api/bid`)
            .mockResolvedValue({
                json: () => Promise.resolve({ bid: 40000.0 }),
            });

        // Mock a hot wallet balance for FIRMA_REDEEM_WALLET
        mockedChronik.setUtxosByAddress(FIRMA_REDEEM_ADDRESS, [
            { sats: 1_000_000_00n },
        ]);

        // Make sure it's cached
        mockedChronik.setTx(FIRMA.tx.txid, FIRMA.tx);
        mockedChronik.setToken(FIRMA.tokenId, FIRMA.token);

        // Mock response for agora select params check
        // Note
        // We obtain EXPECTED_OFFER_P2SH by adding
        // console.log(toHex(shaRmd160(agoraScript.bytecode)));
        // to ecash-agora lib and running this test
        // Note that Date() and Math.random() must be mocked to keep this deterministic
        const EXPECTED_OFFER_P2SH = '840d485a7de0117b289606cfb68cf1b8407c763b';

        // We mock no existing utxos
        mockedChronik.setUtxosByScript('p2sh', EXPECTED_OFFER_P2SH, []);

        // Note that we cannot use mockedAgora to avoid agoraQueryErrors, as we need a proper
        // agora object to build the partial
        // This means we cannot mock firma offers in the OrderBook for this test
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

        // Firma token icon is rendered
        expect(
            await screen.findByAltText(`icon for ${FIRMA.tokenId}`),
        ).toBeInTheDocument();

        // Token actions are available
        expect(screen.getByTitle('Token Actions')).toBeInTheDocument();

        // On load, default action for FIRMA is to redeem it
        expect(screen.getByTitle('Toggle Redeem FIRMA')).toBeEnabled();

        // We can though manually click to list it
        await userEvent.click(screen.getByTitle('Toggle Sell Token'));

        // We can try to list for less than $1
        await userEvent.type(screen.getByPlaceholderText('Offered qty'), '1');
        // List for 1,000 XEC
        await userEvent.type(
            screen.getByPlaceholderText('Enter list price (per token)'),
            '1000',
        );

        // Make sure the min buy is correct
        await userEvent.clear(screen.getByPlaceholderText('Min qty'));
        await userEvent.type(screen.getByPlaceholderText('Min qty'), '1');

        // The redeem button is disabled on load
        const listButton = await screen.findByRole('button', {
            name: /List Firma/,
        });

        // try to list
        await userEvent.click(listButton);

        // Async as we must wait for multiple partials
        expect(await screen.findByText('List FIRMA?')).toBeInTheDocument();

        // We see a warning msg about the poorly selected price
        expect(
            await screen.findByText(
                `⚠️ Warning: You are listing FIRMA for 1,000 XEC per token, which is below FIRMA's current buy price of 40,000 XEC per token. You should redeem FIRMA instead to get the best price.`,
            ),
        ).toBeInTheDocument();

        // The "OK" button is disabled
        expect(screen.getByText('OK')).toBeDisabled();
    });
});
