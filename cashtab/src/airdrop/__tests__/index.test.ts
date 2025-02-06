// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    getAirdropTx,
    getEqualAirdropTx,
    getAgoraHolders,
    getP2pkhHolders,
} from 'airdrop';
import { tokenUtxos, p2pkhHoldersTokenUtxos } from 'airdrop/fixtures/mocks';
import vectors from 'airdrop/fixtures/vectors';
import {
    MockAgora,
    MockChronikClient,
} from '../../../../modules/mock-chronik-client/dist';
import {
    agoraOfferCachetAlphaOne,
    agoraOfferCachetBetaOne,
} from 'components/Agora/fixtures/mocks';
import {
    ChronikClient,
    OutPoint,
    TokenType,
    Token,
    Utxo,
    TokenIdUtxos,
} from 'chronik-client';
import { Agora } from 'ecash-agora';

const CACHET_TOKEN_ID =
    'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1';

const mockTokenId = '00'.repeat(32);
const mockOutpoint: OutPoint = { txid: '11'.repeat(32), outIdx: 0 };
const mockTokenType: TokenType = {
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
    number: 1,
};
const mockToken: Token = {
    tokenId: mockTokenId,
    tokenType: mockTokenType,
    amount: '100',
    isMintBaton: false,
};
// Mock p2pkh holder
const mockHolderP2pkh: Utxo = {
    outpoint: mockOutpoint,
    blockHeight: 800000,
    isCoinbase: false,
    script: '76a91400cd590bfb90b6dc1725530d6c36c78b88ddb60888ac',
    value: 546,
    isFinal: true,
    token: mockToken,
};
// Mock p2sh holder (agora offer)
const mockHolderP2sh: Utxo = {
    outpoint: mockOutpoint,
    blockHeight: 800000,
    isCoinbase: false,
    script: 'a914cfbe04a8a5fa04a032977138d8099862d5b40f7687',
    value: 546,
    isFinal: true,
    token: mockToken,
};
// mock p2pk holder (non-standard)
const mockHolderP2pk = {
    ...mockHolderP2pkh,
    script: '047fa64f6874fb7213776b24c40bc915451b57ef7f17ad7b982561f99f7cdc7010d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bd',
};
// Mock a TokenUtxos return
const mockedTokenUtxos: TokenIdUtxos = {
    tokenId: mockTokenId,
    utxos: [
        mockHolderP2pkh,
        mockHolderP2sh,
        { ...mockHolderP2pkh, token: { ...mockToken, amount: '500' } },
    ],
};
describe('Cashtab airdrop methods', () => {
    describe('getAgoraHolders()', () => {
        it('We can get a p2pkh hash and the qty of token this hash listed from a single agora offer', async () => {
            const mockAgora = new MockAgora();
            const mockAgoraOffers = [agoraOfferCachetAlphaOne];
            mockAgora.setActiveOffersByTokenId(
                CACHET_TOKEN_ID,
                mockAgoraOffers,
            );
            expect(
                await getAgoraHolders(
                    mockAgora as unknown as Agora,
                    CACHET_TOKEN_ID,
                ),
            ).toStrictEqual(
                new Map([
                    [
                        '76a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac',
                        10000n,
                    ],
                ]),
            );
        });
        it('We can get multiple p2pkh hashes and the qty of tokens they each listed from a multiple agora offers created by different public keys', async () => {
            const mockAgora = new MockAgora();
            const mockAgoraOffers = [
                agoraOfferCachetAlphaOne,
                agoraOfferCachetBetaOne,
            ];
            mockAgora.setActiveOffersByTokenId(
                CACHET_TOKEN_ID,
                mockAgoraOffers,
            );
            expect(
                await getAgoraHolders(
                    mockAgora as unknown as Agora,
                    CACHET_TOKEN_ID,
                ),
            ).toStrictEqual(
                new Map([
                    [
                        '76a91403b830e4b9dce347f3495431e1f9d1005f4b420488ac',
                        10000n,
                    ],
                    [
                        '76a914f208ef75eb0dd778ea4540cbd966a830c7b94bb088ac',
                        30000n,
                    ],
                ]),
            );
        });
    });
    describe('getP2pkhHolders', () => {
        it('We can get a map of all p2pkh holders and their balance (excluding p2sh and other non-p2pkh scripts)', async () => {
            const mockedChronik = new MockChronikClient();
            mockedChronik.setUtxosByTokenId(mockTokenId, [
                ...mockedTokenUtxos.utxos,
                mockHolderP2pk,
            ]);
            expect(
                await getP2pkhHolders(
                    mockedChronik as unknown as ChronikClient,
                    mockTokenId,
                ),
            ).toStrictEqual(
                new Map([
                    [
                        '76a91400cd590bfb90b6dc1725530d6c36c78b88ddb60888ac',
                        600n,
                    ],
                    // Note we DO NOT get the p2sh offer or p2pk
                ]),
            );
        });
        it('We can get a map of all p2pkh holders and their balance for the tokenUtxos mock (i.e. we exclude a holder of only the mint baton)', async () => {
            const mockedChronik = new MockChronikClient();
            mockedChronik.setUtxosByTokenId(
                tokenUtxos.tokenId,
                tokenUtxos.utxos,
            );
            expect(
                await getP2pkhHolders(
                    mockedChronik as unknown as ChronikClient,
                    tokenUtxos.tokenId,
                ),
            ).toStrictEqual(p2pkhHoldersTokenUtxos);
        });
        it('We get an empty map if the token has no utxos', async () => {
            const mockedChronik = new MockChronikClient();
            mockedChronik.setUtxosByTokenId(mockTokenId, []);
            expect(
                await getP2pkhHolders(
                    mockedChronik as unknown as ChronikClient,
                    mockTokenId,
                ),
            ).toStrictEqual(new Map());
        });
        it('Throws chronik error if there is an error making the chronik query', async () => {
            const mockedChronik = new MockChronikClient();
            mockedChronik.setUtxosByTokenId(
                mockTokenId,
                new Error('some chronik error'),
            );
            await expect(
                getP2pkhHolders(
                    mockedChronik as unknown as ChronikClient,
                    mockTokenId,
                ),
            ).rejects.toEqual(new Error('some chronik error'));
        });
    });
    describe('Gets csv list of airdrop recipients address and amounts for a standard (prorata) airdrop', () => {
        const { expectedReturns, expectedErrors } = vectors.getAirdropTx;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                p2pkhHoldersTokenUtxos,
                excludedAddresses,
                airdropAmountXec,
                minTokenQtyUndecimalized,
                returned,
            } = expectedReturn;

            it(`getAirdropTx: ${description}`, () => {
                expect(
                    getAirdropTx(
                        p2pkhHoldersTokenUtxos,
                        excludedAddresses,
                        airdropAmountXec,
                        minTokenQtyUndecimalized,
                    ),
                ).toEqual(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const {
                description,
                p2pkhHoldersTokenUtxos,
                excludedAddresses,
                airdropAmountXec,
                minTokenQtyUndecimalized,
                err,
            } = expectedError;
            it(`getAirdropTx throws error for: ${description}`, () => {
                expect(() =>
                    getAirdropTx(
                        p2pkhHoldersTokenUtxos,
                        excludedAddresses,
                        airdropAmountXec,
                        minTokenQtyUndecimalized,
                    ),
                ).toThrow(err);
            });
        });
    });
    describe('Gets csv list of airdrop recipients address and amounts for an equal airdrop', () => {
        const { expectedReturns, expectedErrors } = vectors.getEqualAirdropTx;
        expectedReturns.forEach(expectedReturn => {
            const {
                description,
                p2pkhHoldersTokenUtxos,
                excludedAddresses,
                airdropAmountXec,
                minTokenQtyUndecimalized,
                returned,
            } = expectedReturn;
            it(`getEqualAirdropTx: ${description}`, () => {
                expect(
                    getEqualAirdropTx(
                        p2pkhHoldersTokenUtxos,
                        excludedAddresses,
                        airdropAmountXec,
                        minTokenQtyUndecimalized,
                    ),
                ).toEqual(returned);
            });
        });
        expectedErrors.forEach(expectedError => {
            const {
                description,
                p2pkhHoldersTokenUtxos,
                excludedAddresses,
                airdropAmountXec,
                minTokenQtyUndecimalized,
                err,
            } = expectedError;
            it(`getEqualAirdropTx throws error for: ${description}`, () => {
                expect(() =>
                    getEqualAirdropTx(
                        p2pkhHoldersTokenUtxos,
                        excludedAddresses,
                        airdropAmountXec,
                        minTokenQtyUndecimalized,
                    ),
                ).toThrow(err);
            });
        });
    });
});
