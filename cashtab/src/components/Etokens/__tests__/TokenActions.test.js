// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
import CashtabCache from 'config/CashtabCache';
import { cashtabCacheToJSON } from 'helpers';
import { Ecc, initWasm, toHex } from 'ecash-lib';
import { MockAgora } from '../../../../../modules/mock-chronik-client';
import * as wif from 'wif';

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

describe('<Token /> available actions rendered', () => {
    let ecc;
    beforeAll(async () => {
        await initWasm();
        ecc = new Ecc();
    });
    let mockedChronik;
    beforeEach(async () => {
        // Mock the app with context at the Token Action screen
        mockedChronik = await initializeCashtabStateForTests(
            tokenTestWallet,
            localforage,
        );

        // Build chronik mocks that Cashtab would use to add token info to cache
        for (const tokenMock of supportedTokens) {
            mockedChronik.setMock('token', {
                input: tokenMock.tokenId,
                output: tokenMock.token,
            });
            mockedChronik.setMock('tx', {
                input: tokenMock.tokenId,
                output: tokenMock.tx,
            });
            mockedChronik.setTokenId(tokenMock.tokenId);
            mockedChronik.setUtxosByTokenId(tokenMock.tokenId, {
                tokenId: tokenMock.tokenId,
                utxos: tokenMock.utxos,
            });
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

        // The send switch is turned on by default
        expect(screen.getByTitle('Toggle Send')).toHaveProperty(
            'checked',
            true,
        );

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

        // The send switch is turned on by default
        expect(screen.getByTitle('Toggle Send')).toHaveProperty(
            'checked',
            true,
        );

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
    it('We can correctly render an SLP1 NFT Parent token with no NFT Mint inputs, then create some NFT Mint inputs', async () => {
        const hex =
            '0200000002cc04a35686950a66845ebf8e37677fffcc5ee0e2b63e3f05822838273149660c010000006441878aa7e698097a4961646a2da44f701d8895cb065113fcf1d2e9f073afbc37025a5587e121bd0311a24a7af60445abfc4de7e3675a3a9f51cffddc875d88fca24121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064412f509f90f23f4b85b27452e0f25d33cef07ad8fef898e2d308c43fb0dfd6f7e00f7201336be4089171ddc094a24688882b518ec0c6958c904df12d0239a7342f4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff150000000000000000d96a04534c500001810453454e44200c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc08000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000005222020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac0d070f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'cdc6afbf1ddd796388692ec9106816be1f9229ece11e545c1cbe6854ccf087ec';

        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
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
                            value: 546,
                            isFinal: true,
                            token: {
                                tokenId:
                                    '0c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc',
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_NFT1_GROUP',
                                    number: 129,
                                },
                                amount: '1',
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
            mintNftMockedChronik.setMock('token', {
                input: tokenMock.tokenId,
                output: tokenMock.token,
            });
            mintNftMockedChronik.setMock('tx', {
                input: tokenMock.tokenId,
                output: tokenMock.tx,
            });
            mintNftMockedChronik.setTokenId(tokenMock.tokenId);
            mintNftMockedChronik.setUtxosByTokenId(tokenMock.tokenId, {
                tokenId: tokenMock.tokenId,
                utxos: tokenMock.utxos,
            });
            // Set empty tx history to mock no existing NFTs
            mintNftMockedChronik.setTxHistoryByTokenId(tokenMock.tokenId, []);
        }

        const hex =
            '02000000023333333333333333333333333333333333333333333333333333333333333333010000006441516d7c24c909e3a775b1678ef365ca3c01fc1376f4471cc1c72c7fb86c422f88cd3fb9b9e9463b76269ebe02860786be3edf918b54e73e6393379416182f7d794121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441f511724b183a21997d7dcb967102447146ac794d0b2a955e83bd9e00596b926b585e7212ba9559dad44ed0f8248582f6158985ac2fa387b5eeee2299ca03d6984121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000396a04534c500001410747454e455349534c000b426974636f696e204142430b636173687461622e636f6d4c0001004c0008000000000000000122020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac80330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            '2db0bbdbc2772bbbb1e334a995a8fd280f32ee94adc75e3006acbe445688de3a';

        mintNftMockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mintNftMockedChronik}
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

        // We can mint an NFT if we give it a name
        await userEvent.type(
            await screen.findByPlaceholderText('Enter a name for your NFT'),
            'Bitcoin ABC',
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
            renderChildNftsMockedChronik.setMock('token', {
                input: tokenMock.tokenId,
                output: tokenMock.token,
            });
            renderChildNftsMockedChronik.setMock('tx', {
                input: tokenMock.tokenId,
                output: tokenMock.tx,
            });
            renderChildNftsMockedChronik.setTokenId(tokenMock.tokenId);
            renderChildNftsMockedChronik.setUtxosByTokenId(tokenMock.tokenId, {
                tokenId: tokenMock.tokenId,
                utxos: tokenMock.utxos,
            });
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
        // Set empty agora mocks so we can test proper routing to NFT market page on successful list
        const mockedAgora = new MockAgora();

        mockedAgora.setOfferedGroupTokenIds([]);

        // activeOffersByPubKey
        // The test wallet is selling the Saturn V NFT
        const thisPrivateKey = wif.decode(
            tokenTestWallet.paths.get(appConfig.derivationPath).wif,
        ).privateKey;
        const thisPublicKey = ecc.derivePubkey(thisPrivateKey);
        mockedAgora.setActiveOffersByPubKey(toHex(thisPublicKey), []);

        // activeOffersByGroupTokenId does not need to be mocked since there are no offers here

        // NFT ad prep
        const adPrepHex =
            '0200000002268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d010000006441645e5d4141c2e9207f5a743a0f672f0710a352347df32954c3a24a19c64e8d9b95007335bf5491d4f69eac89a389fb1cbc3b868f3342ac38a7e23b5c8976c72e4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf7926180300000064418a094d8cccbff0073e0b97fb84dfb849766545cbd4a764ad1d68b9a8ca5822feea93833c4df54fc5d7b52a73f0ba0fdf987a78f7481a5c55d351472f152931d04121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326080000000000000001b80b00000000000017a91407d2b0e6ec7b96cbfbe4a7d54e28d28fbcf65e4087f2290f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const adPrepTxid =
            '6543a807c83363e5d43587dcd15239b9c82a485e2b1ebbd730e82a0f0db4385f';

        mockedChronik.setMock('broadcastTx', {
            input: adPrepHex,
            output: { txid: adPrepTxid },
        });

        // NFT ad list
        const adListHex =
            '02000000015f38b40d0f2ae830d7bb1e2b5e482ac8b93952d1dc8735d4e56333c807a8436501000000a70441475230074f4e4553484f54416c8c3c5fb1d038dcce630a1504a04c2333c50fddfbb35b37c01ad4e89f0e2aae103703f2a2cf94cef51cbeff6c442feb961f4ec2fc948d59dc61b6ee83b3f262414c56222b50fe00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac7521031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dad074f4e4553484f5488044147523087ffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a2228326080000000000000001220200000000000017a914729833ae294590bbcf28bfbb9ad54c01b6cdb62887da060000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const adListTxid =
            'd732c995d4071786a689dff175c60982c57a14a3e2f6362ee0418fba6a5eca7f';

        mockedChronik.setMock('broadcastTx', {
            input: adListHex,
            output: { txid: adListTxid },
        });

        // NFT send
        const hex =
            '0200000002268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d010000006441fff60607ba0fb6eda064075b321abc3980c249efcc0e91d4d95e464500a654476e59b76dd19bdd66f5d207a0d731550c93ce724a09e00a3bff3fcfbc08c970844121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441fe754300443dfb293619693087016c9d9a8437489d48cb7c0c3fcb6b5af6277833ff7156355aeb557145c4075b7917d90d79239ba7bf776a38fef935d8da2f7c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a222832608000000000000000122020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac84330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'daa5872d1ef95a05bd3ee59fc532aa7921a54b783a5af68c5aa9146f61d2e134';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
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
        expect(screen.getByTitle('Toggle Sell')).toHaveProperty(
            'checked',
            true,
        );

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
        expect(listButton).toHaveProperty('disabled', true);

        await userEvent.clear(priceInput);

        // No validation error if NFT list price is for more than dust
        await userEvent.type(priceInput, '10000');
        expect(
            screen.queryByText(
                'List price cannot be less than dust (5.46 XEC).',
            ),
        ).not.toBeInTheDocument();

        // The List button is NOT disabled if price is greater than dust
        expect(listButton).toHaveProperty('disabled', false);

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
        expect(screen.getByText(/List GC for \$ 5 USD/)).toBeInTheDocument();

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

        // We route to the NFTs page
        expect(await screen.findByTitle('Listed NFTs')).toBeInTheDocument();
    });
    it('We can send an SLP1 NFT', async () => {
        // NFT send
        const hex =
            '0200000002268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d010000006441fff60607ba0fb6eda064075b321abc3980c249efcc0e91d4d95e464500a654476e59b76dd19bdd66f5d207a0d731550c93ce724a09e00a3bff3fcfbc08c970844121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006441fe754300443dfb293619693087016c9d9a8437489d48cb7c0c3fcb6b5af6277833ff7156355aeb557145c4075b7917d90d79239ba7bf776a38fef935d8da2f7c4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a222832608000000000000000122020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac84330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'daa5872d1ef95a05bd3ee59fc532aa7921a54b783a5af68c5aa9146f61d2e134';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
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
        const sellActionSwitch = screen.getByTitle('Toggle Sell');
        expect(sellActionSwitch).toHaveProperty('checked', true);

        // Sending is disabled
        const sendActionSwitch = screen.getByTitle('Toggle Send');

        expect(sendActionSwitch).toHaveProperty('checked', false);

        // When we enable Sending, Selling is disabled, and Sending is enabled
        await userEvent.click(sendActionSwitch);
        expect(sendActionSwitch).toHaveProperty('checked', true);
        expect(sellActionSwitch).toHaveProperty('checked', false);

        // We see an Address input
        const addrInput = screen.getByPlaceholderText('Address');
        expect(addrInput).toBeInTheDocument();

        // Send button is disabled before address entry
        const sendButton = screen.getByRole('button', {
            name: /Send GC/,
        });
        expect(sendButton).toHaveProperty('disabled', true);

        // We can enter an address
        await userEvent.type(
            addrInput,
            'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
        );

        // Now the button is enabled
        expect(sendButton).toHaveProperty('disabled', false);

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
            renderChildNftsMockedChronik.setMock('token', {
                input: tokenMock.tokenId,
                output: tokenMock.token,
            });
            renderChildNftsMockedChronik.setMock('tx', {
                input: tokenMock.tokenId,
                output: tokenMock.tx,
            });
            renderChildNftsMockedChronik.setTokenId(tokenMock.tokenId);
            renderChildNftsMockedChronik.setUtxosByTokenId(tokenMock.tokenId, {
                tokenId: tokenMock.tokenId,
                utxos: tokenMock.utxos,
            });
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
    it('ALP token', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
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
            screen.getByText(`This token is not yet supported by Cashtab.`),
        ).toBeInTheDocument();

        // Close out of the info modal
        await userEvent.click(screen.getByText('OK'));

        // The supply is correctly rendered
        expect(screen.getByText('111,367.0000 (var.)')).toBeInTheDocument();

        // No token actions are available
        expect(screen.queryByTitle('Token Actions')).not.toBeInTheDocument();
    });
});
