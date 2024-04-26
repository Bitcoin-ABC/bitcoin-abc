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
            '0200000002cc04a35686950a66845ebf8e37677fffcc5ee0e2b63e3f05822838273149660c010000006a473044022100b840b3309470345961119f6ca6d76e9f7fc0712faea4ee768b315f37885e3b82021f3bbb0060fa8696684178c62fcbd9469a28966bc80433bec27212aeaadfeeb54121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006a473044022023c4c4ceb92d9047235fe0636147da0f698ffd6dc06bbf63daf54e3f8f695ade022078e78105200ad9dcbb43798a84f65b29ee5ad21567553375ee3b34e812c8141d4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff150000000000000000d96a04534c500001810453454e44200c66493127382882053f3eb6e2e05eccff7f67378ebf5e84660a958656a304cc08000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000000108000000000000005222020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac22020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288acf0060f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'bda5b633abfd75ef157982ab9da3fa5a64820c18f2c14889bb2b4449acf75199';

        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
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
            '02000000023333333333333333333333333333333333333333333333333333333333333333010000006b483045022100f29cab5bc2727d43e817f7585f496f5f459d9bffcb91cf32330ca5ae447e1eac02203b6cbe6ab35ff4c932ca8da2c88e21a7707649147e47e2a689be794c861bb0074121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006b483045022100bf0fdca223b0dd1aa3adb9b62aa33b8e212dc0ddce9dfeded09510f7cfc1b69e02206bb789417a9928d16cf4c1e4430ff1d3bdf8d23d3fe67dd5e4bf706b44f52c194121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000396a04534c500001410747454e455349534c000b426974636f696e204142430b636173687461622e636f6d4c0001004c0008000000000000000122020000000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac64330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'fe32c58234fe67d8dc6ccbaea27c575e9747e7486da783aa593882355c9d392a';

        mintNftMockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mintNftMockedChronik}
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
    it('SLP1 NFT', async () => {
        const hex =
            '0200000002268322a2a8e67fe9efdaf15c9eb7397fb640ae32d8a245c2933f9eb967ff9b5d010000006a47304402205421a0ab0fa58e20fbe2632e58cbcee64e27f680c21675353b96a541f0576e39022019000e6aee98a49953c8581e2f04a140e983ea249d7884560ecc99b5ec6a87774121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffffef76d01776229a95c45696cf68f2f98c8332d0c53e3f24e73fd9c6deaf792618030000006a47304402207a1bce20f7f66ee2a4125c52a8f23b9a561269c0e87aad435ec33358e681233f02206d080cd78170257710afa02d29d61844c7450333db87e1b6a13268cc49228fde4121031d4603bdc23aca9432f903e3cf5975a3f655cc3fa5057c61d00dfc1ca5dfd02dffffffff030000000000000000376a04534c500001410453454e44205d9bff67b99e3f93c245a2d832ae40b67f39b79e5cf1daefe97fe6a8a222832608000000000000000122020000000000001976a91495e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d88ac68330f00000000001976a91400549451e5c22b18686cacdf34dce649e5ec3be288ac00000000';
        const txid =
            'b2c53165d7a6b0d39a0d0939e4ffd47db2441941ecbaac9c053323deaef08a20';
        mockedChronik.setMock('broadcastTx', {
            input: hex,
            output: { txid },
        });
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
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

        // We see an address input field
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

        // We see an address input field
        const addrInput = screen.getByPlaceholderText('Address');
        expect(addrInput).toBeInTheDocument();
    });
    it('ALP token', async () => {
        render(
            <CashtabTestWrapper
                chronik={mockedChronik}
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
