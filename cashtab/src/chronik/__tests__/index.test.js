// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    parseTx,
    getTxNotificationMsg,
    getTokenGenesisInfo,
    getTokenBalances,
    getTransactionHistory,
    getAllTxHistoryByTokenId,
    getChildNftsFromParent,
} from 'chronik';
import vectors from '../fixtures/vectors';
import {
    EDJ_COM_GAME_ADDRESSES,
    CACHET_TOKEN_ID,
    EDJ_TOKEN_ID,
    FIRMA,
} from 'constants/tokens';
import {
    chronikTokenMocks,
    mockLargeTokenCache,
    chronikSlpUtxos,
    keyValueBalanceArray,
    mockTxHistoryWalletJson,
    mockPath1899History,
    mockTxHistoryTokenCache,
    tokensInHistory,
    expectedParsedTxHistory,
    noCachedInfoParsedTxHistory,
    NftParentGenesisTx,
    NftChildGenesisTx,
    cachetSendToEdjTx,
    edjSendTx,
    edjPayoutTx,
    edjFirmaPayoutTx,
} from '../fixtures/mocks';
import { MockChronikClient } from '../../../../modules/mock-chronik-client';
import CashtabCache from 'config/CashtabCache';

describe('Cashtab chronik.js functions', () => {
    describe('Parses supported tx types', () => {
        const { expectedReturns } = vectors.parseTx;
        expectedReturns.forEach(expectedReturn => {
            const { description, tx, hashes, parsed } = expectedReturn;
            it(`parseTx: ${description}`, () => {
                expect(parseTx(tx, hashes)).toStrictEqual(parsed);
            });
        });
    });
    describe('Gets expected notification msg string', () => {
        const { expectedReturns } = vectors.getTxNotificationMsg;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                parsedTx,
                fiatPrice,
                userLocale,
                selectedFiatTicker,
                genesisInfo,
                returned,
            } = expectedReturn;
            it(`getTxNotificationMsg: ${description}`, () => {
                expect(
                    getTxNotificationMsg(
                        parsedTx,
                        fiatPrice,
                        userLocale,
                        selectedFiatTicker,
                        genesisInfo,
                    ),
                ).toEqual(returned);
            });
        });
    });
    describe('We get info we want to cache about a token from its genesis tx and chronik token info endpoint', () => {
        const { expectedReturns, expectedErrors } = vectors.getTokenGenesisInfo;

        expectedReturns.forEach(expectedReturn => {
            const { description, tokenId, tokenInfo, genesisTx, returned } =
                expectedReturn;
            const mockedChronik = new MockChronikClient();

            // Set mock for chronik.token(tokenId)
            mockedChronik.setToken(tokenId, tokenInfo);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, genesisTx);

            it(`getTokenGenesisInfo: ${description}`, async () => {
                expect(
                    await getTokenGenesisInfo(mockedChronik, tokenId),
                ).toStrictEqual(returned);
            });
        });

        expectedErrors.forEach(expectedReturn => {
            const { description, tokenId, tokenInfo, genesisTx, msg } =
                expectedReturn;
            const mockedChronik = new MockChronikClient();

            // Set mock for chronik.token(tokenId)
            mockedChronik.setToken(tokenId, tokenInfo);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, genesisTx);

            it(`getTokenGenesisInfo: ${description}`, async () => {
                await expect(
                    getTokenGenesisInfo(mockedChronik, tokenId),
                ).rejects.toEqual(msg);
            });
        });
    });
    it('We can get token balance from a large token utxo set and update the cache', async () => {
        // Mock the endpoints that will be called in updating the cache during getTokenBalances
        const tokenIds = Object.keys(chronikTokenMocks);
        const mockedChronik = new MockChronikClient();
        for (const tokenId of tokenIds) {
            const { token, tx } = chronikTokenMocks[tokenId];
            // Set mock for chronik.token(tokenId)
            mockedChronik.setToken(tokenId, token);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, tx);
        }

        // Initialize an empty token cache
        const tokenCache = new CashtabCache().tokens;

        // Get token balances
        const tokenBalances = await getTokenBalances(
            mockedChronik,
            chronikSlpUtxos,
            tokenCache,
        );

        // Expect cache is updated
        expect(tokenCache).toStrictEqual(mockLargeTokenCache);

        // Expect correct balances
        expect(tokenBalances).toStrictEqual(new Map(keyValueBalanceArray));
    });
    it('We can get token balance form a large token utxo set that includes a utxo of unknown tokenId and update the cache', async () => {
        // Mock the endpoints that will be called in updating the cache during getTokenBalances
        const tokenIds = Object.keys(chronikTokenMocks);
        const mockedChronik = new MockChronikClient();
        for (const tokenId of tokenIds) {
            const { token, tx } = chronikTokenMocks[tokenId];
            // Set mock for chronik.token(tokenId)
            mockedChronik.setToken(tokenId, token);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, tx);
        }

        // Initialize an empty token cache
        const tokenCache = new CashtabCache().tokens;

        // Get token balances
        const tokenBalances = await getTokenBalances(
            mockedChronik,
            [
                ...chronikSlpUtxos,
                {
                    outpoint: {
                        txid: '74a8598eed00672e211553a69e22334128199883fe79eb4ad64f9c0b7909735c',
                        outIdx: 1,
                    },
                    blockHeight: 836457,
                    isCoinbase: false,
                    sats: 1000n,
                    isFinal: true,
                    token: {
                        tokenId:
                            '0000000000000000000000000000000000000000000000000000000000000000',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_UNKNOWN',
                            number: 255,
                        },
                        atoms: 0n,
                        isMintBaton: false,
                    },
                },
            ],
            tokenCache,
        );

        // Expect cache is updated
        expect(tokenCache).toStrictEqual(mockLargeTokenCache);

        // Expect correct balances, including a 0 balance for the unknown token id
        expect(tokenBalances).toStrictEqual(
            new Map([
                ...keyValueBalanceArray,
                [
                    '0000000000000000000000000000000000000000000000000000000000000000',
                    '0',
                ],
            ]),
        );
    });
    it('We can get and parse tx history from path 1899, and update the token cache at the same time', async () => {
        // Make all of your chronik mocks
        const tokenIds = Object.keys(tokensInHistory);
        const mockedChronik = new MockChronikClient();
        for (const tokenId of tokenIds) {
            const { token, tx } = tokensInHistory[tokenId];
            // Set mock for chronik.token(tokenId)
            mockedChronik.setToken(tokenId, token);

            // Set mock for chronik.tx(tokenId)
            mockedChronik.setTx(tokenId, tx);
        }

        // Revive JSON wallet
        const mockTxHistoryWallet = mockTxHistoryWalletJson;

        const defaultAddress = mockTxHistoryWallet.address;

        // Set tx history for path 1899 only
        mockedChronik.setTxHistoryByAddress(
            defaultAddress,
            mockPath1899History,
        );

        // Initialize an empty token cache
        const tokenCache = new CashtabCache().tokens;

        // Get token balances
        const result = await getTransactionHistory(
            mockedChronik,
            defaultAddress,
            tokenCache,
        );
        const parsedTxHistory = result.txs;

        // Expect cache is updated
        expect(tokenCache).toStrictEqual(mockTxHistoryTokenCache);

        // Expect correct tx history (only from path 1899)
        expect(parsedTxHistory).toStrictEqual(expectedParsedTxHistory);
    });
    describe('We can get and parse tx history from path 1899. If there is an error in getting cached token data, we still parse tx history.', () => {
        // Make all of your chronik mocks
        const tokenIds = Object.keys(tokensInHistory);
        const mockedChronik = new MockChronikClient();
        for (const tokenId of tokenIds) {
            // Mock an error in getting cached token info
            mockedChronik.setToken(tokenId, new Error('Some chronik error'));
        }

        // Revive JSON wallet
        const mockTxHistoryWallet = mockTxHistoryWalletJson;

        const defaultAddress = mockTxHistoryWallet.address;

        // Set tx history for path 1899 only
        mockedChronik.setTxHistoryByAddress(
            defaultAddress,
            mockPath1899History,
        );

        it(`We add to token cache and get parsed tx history`, async () => {
            // Initialize an empty token cache
            const tokenCache = new CashtabCache().tokens;

            // Get token balances
            const result = await getTransactionHistory(
                mockedChronik,
                defaultAddress,
                tokenCache,
            );
            const parsedTxHistory = result.txs;

            // Expect cache is unchanged
            expect(tokenCache).toStrictEqual(new CashtabCache().tokens);

            // Expect correct tx history
            expect(parsedTxHistory).toStrictEqual(noCachedInfoParsedTxHistory);
        });
    });
    describe('We can get tx history by tokenId', () => {
        it('We can get tx history if total txs are less than one page', async () => {
            // Initialize chronik mock with history info
            const mockedChronik = new MockChronikClient();
            const tokenId =
                '1111111111111111111111111111111111111111111111111111111111111111';
            mockedChronik.setTxHistoryByTokenId(tokenId, [
                { txid: 'deadbeef' },
            ]);
            expect(
                await getAllTxHistoryByTokenId(mockedChronik, tokenId),
            ).toStrictEqual([{ txid: 'deadbeef' }]);
        });
        it('We can get tx history if we need to fetch multiple pages', async () => {
            // Initialize chronik mock with history info
            const mockedChronik = new MockChronikClient();
            const tokenId =
                '1111111111111111111111111111111111111111111111111111111111111111';
            mockedChronik.setTxHistoryByTokenId(
                tokenId,
                [
                    { txid: 'deadbeef' },
                    { txid: 'deadbeef' },
                    { txid: 'deadbeef' },
                ],
                1,
            );
            expect(
                await getAllTxHistoryByTokenId(mockedChronik, tokenId),
            ).toStrictEqual([
                { txid: 'deadbeef' },
                { txid: 'deadbeef' },
                { txid: 'deadbeef' },
            ]);
        });
        it('We get an empty array if the token has no tx history', async () => {
            // Initialize chronik mock with history info
            const mockedChronik = new MockChronikClient();
            const tokenId =
                '1111111111111111111111111111111111111111111111111111111111111111';
            mockedChronik.setTxHistoryByTokenId(tokenId, []);
            expect(
                await getAllTxHistoryByTokenId(mockedChronik, tokenId),
            ).toStrictEqual([]);
        });
    });
    describe('We can get NFTs from the tx history of an NFT Parent tokenId', () => {
        const PARENT_TOKENID =
            '12a049d0da64652b4e8db68b6052ad0cda43cf0269190fe81040bed65ca926a3';
        it('We return an empty array if history includes only the parent genesis tx', () => {
            expect(
                getChildNftsFromParent(PARENT_TOKENID, [NftParentGenesisTx]),
            ).toStrictEqual([]);
        });
        it('We return an NFT if history includes NFT and parent genesis tx', () => {
            expect(
                getChildNftsFromParent(PARENT_TOKENID, [
                    NftChildGenesisTx,
                    NftParentGenesisTx,
                ]),
            ).toStrictEqual([NftChildGenesisTx.tokenEntries[0].tokenId]);
        });
        it('We return multiple NFTs if history includes them', () => {
            expect(
                getChildNftsFromParent(PARENT_TOKENID, [
                    NftChildGenesisTx,
                    {
                        ...NftChildGenesisTx,
                        tokenEntries: [
                            {
                                ...NftChildGenesisTx.tokenEntries[0],
                                tokenId:
                                    '2222222222222222222222222222222222222222222222222222222222222222',
                            },
                        ],
                    },
                    NftParentGenesisTx,
                ]),
            ).toStrictEqual([
                NftChildGenesisTx.tokenEntries[0].tokenId,
                '2222222222222222222222222222222222222222222222222222222222222222',
            ]);
        });
    });
    describe('Parse DICE and ROLL EMPP messages', () => {
        it('parseTx: DICE bet transaction with EMPP data', () => {
            // DICE bet transaction from blitz-empp tests
            // txid: 921a2efe13b9df07c94d654786bb46fd400c8d89ad94e26df6d17429054c25e4
            const diceBetTx = {
                txid: '921a2efe13b9df07c94d654786bb46fd400c8d89ad94e26df6d17429054c25e4',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '42fa96a83b681f35d30c11b2a5f8b7a14b18289a5a383efed9d05242a5b4e93a',
                            outIdx: 1,
                        },
                        inputScript:
                            '419a79a15367b632ec4708e87d8fc9639f5c5a5cdfe595ca5474bfb9edbb6e5d4ff0ee13796cb89b3c944a53eb4d6287ee5fc8ee8dac0c54b7bec7caa65cbe8f9241210263252562c7599628121abf30184728fd9be91a070ee4867e02eb21e8cd17d03d',
                        sats: 546n,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            atoms: 111n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        outputScript:
                            '76a914ebc488744ea4b0ca90fd93f06765a4973e918aaa88ac',
                    },
                ],
                outputs: [
                    {
                        sats: 0n,
                        outputScript:
                            '6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f948703022c0100000000a857010000000d44494345003e5e0602f904ea02',
                    },
                    {
                        sats: 546n,
                        outputScript:
                            '76a914fc7250a211deddc70ee5a2738de5f07817351cef88ac',
                        token: {
                            tokenId:
                                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            atoms: 300n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1770253388,
                size: 723,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                        burnsMintBatons: false,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                isFinal: true,
            };

            const walletHash = 'ebc488744ea4b0ca90fd93f06765a4973e918aaa';
            const parsed = parseTx(diceBetTx, [walletHash]);

            // Should have DICE bet app action
            const diceAction = parsed.appActions.find(
                action => action.app === 'DICE Bet',
            );
            expect(diceAction).toBeDefined();
            expect(diceAction.isValid).toBe(true);
            expect(diceAction.action.minValue).toBe(33971774);
            expect(diceAction.action.maxValue).toBe(48891129);
        });

        it('parseTx: ROLL payout transaction with EMPP data', () => {
            // ROLL payout transaction from blitz-empp tests
            // txid: 3422888679d408db36e0232212f78dcb9177a90699c2290b39aa8068656bab80
            const rollPayoutTx = {
                txid: '3422888679d408db36e0232212f78dcb9177a90699c2290b39aa8068656bab80',
                version: 2,
                inputs: [
                    {
                        prevOut: {
                            txid: '4eae238c0c20c428f1d1834d6719c0c5fc08bc74c82a3f7b14f590ff52c39468',
                            outIdx: 1,
                        },
                        inputScript:
                            '4128362d7511d2185513ee818e6c2b352d9d6790ee219c859d5d4ba445b3ddb3b4a0c902a1f73e02d1a70533b1d5d706c771a277c605b4a02007249ce4bdf5ea04412102030e81163c1d05aa12992723ff5446fd9c81b4a27710859579d1f7a1df68b9cd',
                        sats: 546n,
                        sequenceNo: 4294967295,
                        token: {
                            tokenId:
                                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            atoms: 30n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                        outputScript:
                            '76a914fc7250a211deddc70ee5a2738de5f07817351cef88ac',
                    },
                ],
                outputs: [
                    {
                        sats: 0n,
                        outputScript:
                            '6a5037534c5032000453454e44f0cb08302c4bbc665b6241592b19fd37ec5d632f323e9ab14fdb75d57f948703021f00000000004fc3000000004a524f4c4c004eae238c0c20c428f1d1834d6719c0c5fc08bc74c82a3f7b14f590ff52c394685974350535d448c6ff39081db76b9b75be0266dfa5a75eef6ea9c56062d31f5010b6e35657',
                    },
                    {
                        sats: 546n,
                        outputScript:
                            '76a914ebc488744ea4b0ca90fd93f06765a4973e918aaa88ac',
                        token: {
                            tokenId:
                                '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                            tokenType: {
                                protocol: 'ALP',
                                type: 'ALP_TOKEN_TYPE_STANDARD',
                                number: 0,
                            },
                            atoms: 31n,
                            isMintBaton: false,
                            entryIdx: 0,
                        },
                    },
                ],
                lockTime: 0,
                timeFirstSeen: 1770250899,
                size: 677,
                isCoinbase: false,
                tokenEntries: [
                    {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                        txType: 'SEND',
                        isInvalid: false,
                        burnSummary: '',
                        failedColorings: [],
                        actualBurnAtoms: 0n,
                        intentionalBurnAtoms: 0n,
                        burnsMintBatons: false,
                    },
                ],
                tokenFailedParsings: [],
                tokenStatus: 'TOKEN_STATUS_NORMAL',
                isFinal: true,
                block: {
                    height: 934991,
                    hash: '000000000000000004db20a8b4346252ac50eb2e87edbb55a9c3cd21e4f81073',
                    timestamp: 1770251247,
                },
            };

            const walletHash = 'ebc488744ea4b0ca90fd93f06765a4973e918aaa';
            const parsed = parseTx(rollPayoutTx, [walletHash]);

            // Should have ROLL payout app action
            const rollAction = parsed.appActions.find(
                action => action.app === 'ROLL Payout',
            );
            expect(rollAction).toBeDefined();
            expect(rollAction.isValid).toBe(true);
            expect(rollAction.action.betTxid).toBe(
                '4eae238c0c20c428f1d1834d6719c0c5fc08bc74c82a3f7b14f590ff52c39468',
            );
            expect(rollAction.action.roll).toBe(87389273);
            expect(rollAction.action.result).toBe('W');
        });

        it('parseTx: CACHET sent to EverydayJackpot game address (free play)', () => {
            const parsed = parseTx(cachetSendToEdjTx.tx, [
                cachetSendToEdjTx.sendingHash,
            ]);

            expect(parsed.xecTxType).toBe('Sent');
            expect(parsed.recipients).toEqual(
                expect.arrayContaining(EDJ_COM_GAME_ADDRESSES),
            );
            const cachetEntry = parsed.parsedTokenEntries.find(
                e => e.tokenId === CACHET_TOKEN_ID,
            );
            expect(cachetEntry).toBeDefined();
            expect(cachetEntry.renderedTxType).toBe('SEND');
            expect(cachetEntry.tokenSatoshis).toBe('1000'); // 10 CACHET to game
        });

        it('parseTx: EDJ sent to EverydayJackpot game address (EDJ Play)', () => {
            const parsed = parseTx(edjSendTx.tx, [edjSendTx.sendingHash]);

            expect(parsed.xecTxType).toBe('Sent');
            expect(parsed.recipients).toEqual(
                expect.arrayContaining(EDJ_COM_GAME_ADDRESSES),
            );
            const edjEntry = parsed.parsedTokenEntries.find(
                e => e.tokenId === EDJ_TOKEN_ID,
            );
            expect(edjEntry).toBeDefined();
            expect(edjEntry.renderedTxType).toBe('SEND');
            expect(edjEntry.tokenSatoshis).toBe('10000'); // 100 EDJ to game
        });

        it('parseTx: EDJ received from EverydayJackpot game address (EDJ payout)', () => {
            const parsed = parseTx(edjPayoutTx.tx, [edjPayoutTx.receivingHash]);

            expect(parsed.xecTxType).toBe('Received');
            const edjEntry = parsed.parsedTokenEntries.find(
                e => e.tokenId === EDJ_TOKEN_ID,
            );
            expect(edjEntry).toBeDefined();
            expect(edjEntry.renderedTxType).toBe('SEND');
            expect(edjEntry.tokenSatoshis).toBe('5000'); // 50 EDJ payout
        });

        it('parseTx: FIRMA received from EverydayJackpot (EDJ.com payout with trophy)', () => {
            const parsed = parseTx(edjFirmaPayoutTx.tx, [
                edjFirmaPayoutTx.receivingHash,
            ]);

            expect(parsed.xecTxType).toBe('Received');
            const firmaEntry = parsed.parsedTokenEntries.find(
                e => e.tokenId === FIRMA.tokenId,
            );
            expect(firmaEntry).toBeDefined();
            expect(firmaEntry.renderedTxType).toBe('SEND');
            expect(firmaEntry.tokenSatoshis).toBe('141954'); // FIRMA payout
            const trophyAction = parsed.appActions.find(
                a => a.app === 'EDJ.com Payout',
            );
            expect(trophyAction).toBeDefined();
            expect(trophyAction.isValid).toBe(true);
            expect(trophyAction.action.numTxs).toBe(103);
            expect(trophyAction.action.potAtoms).toBe(146004n);
            expect(trophyAction.action.winnerOddsBps).toBe(137);
            expect(trophyAction.action.winnerTxid).toBe(
                '956c1d56c0ef15ed31fa69ff2c5773020b18adc1ec763eeb46f4774bf83c8fca',
            );
        });
    });
});
