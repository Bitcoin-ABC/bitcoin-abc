// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { ChronikClient, TokenInfo, TokenType, Tx } from 'chronik-client';
import { getOutputScriptFromAddress } from 'ecashaddrjs';
import { MockChronikClient } from '../../../modules/mock-chronik-client';
import {
    classifyTokenLookupError,
    getCashtabTokenMetadata,
    getCashtabTokenMetadataWithRetry,
    isSameMinterAddress,
} from './tokenMetadata';

const TEST_TOKEN_ID =
    '1111111111111111111111111111111111111111111111111111111111111111';
const TEST_MINTER_ADDRESS = 'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2';
const OTHER_MINTER_ADDRESS = 'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv';

const ALP_STANDARD: TokenType = {
    protocol: 'ALP',
    type: 'ALP_TOKEN_TYPE_STANDARD',
    number: 0,
};

const SLP_MINT_VAULT: TokenType = {
    protocol: 'SLP',
    type: 'SLP_TOKEN_TYPE_MINT_VAULT',
    number: 2,
};

const input0 = (address: string) => ({
    outputScript: getOutputScriptFromAddress(address),
});

const mockTokenInfo = (tokenType: TokenType): TokenInfo => {
    return {
        tokenId: TEST_TOKEN_ID,
        tokenType,
        genesisInfo: {
            tokenTicker: 'TST',
            tokenName: 'Test Token',
            url: 'https://cashtab.com/',
            decimals: 3,
        },
        timeFirstSeen: 0,
    };
};

describe('tokenMetadata.ts', function () {
    it('classifyTokenLookupError detects chronik not-found errors', function () {
        assert.equal(
            classifyTokenLookupError(
                new Error(
                    `Failed getting /token/${TEST_TOKEN_ID}: 404: Token ${TEST_TOKEN_ID} not found in the index`,
                ),
            ),
            'not_found',
        );
    });
    it('classifyTokenLookupError detects invalid genesis metadata', function () {
        assert.equal(
            classifyTokenLookupError(
                new Error(
                    `No genesis supply or mint baton output found for tokenId ${TEST_TOKEN_ID}`,
                ),
            ),
            'invalid_genesis',
        );
    });
    it('classifyTokenLookupError treats other failures as upstream', function () {
        assert.equal(
            classifyTokenLookupError(
                new Error('Error connecting to known Chronik instances'),
            ),
            'upstream',
        );
    });
    it('isSameMinterAddress accepts the same cash address', function () {
        assert.equal(
            isSameMinterAddress(TEST_MINTER_ADDRESS, TEST_MINTER_ADDRESS),
            true,
        );
    });
    it('isSameMinterAddress rejects a different cash address', function () {
        assert.equal(
            isSameMinterAddress(TEST_MINTER_ADDRESS, OTHER_MINTER_ADDRESS),
            false,
        );
    });
    it('isSameMinterAddress rejects invalid addresses', function () {
        assert.equal(
            isSameMinterAddress(TEST_MINTER_ADDRESS, 'not-an-address'),
            false,
        );
    });
    it('getCashtabTokenMetadata returns FIXED supply for a genesis output', async function () {
        const mockChronik = new MockChronikClient();
        mockChronik.setToken(TEST_TOKEN_ID, mockTokenInfo(ALP_STANDARD));
        mockChronik.setTx(TEST_TOKEN_ID, {
            inputs: [input0(TEST_MINTER_ADDRESS)],
            outputs: [
                {
                    outputScript:
                        getOutputScriptFromAddress(OTHER_MINTER_ADDRESS),
                    token: {
                        tokenId: TEST_TOKEN_ID,
                        isMintBaton: false,
                        atoms: 10000n,
                    },
                },
            ],
        } as Tx);

        assert.deepEqual(
            await getCashtabTokenMetadata(
                mockChronik as unknown as ChronikClient,
                TEST_TOKEN_ID,
            ),
            {
                tokenId: TEST_TOKEN_ID,
                minterAddress: TEST_MINTER_ADDRESS,
                tokenType: 'ALP_TOKEN_TYPE_STANDARD',
                supplyType: 'FIXED',
            },
        );
    });
    it('getCashtabTokenMetadata uses genesis input[0] for an NFT child', async function () {
        // Jupiterally
        // f91f45194313550c963d84adefd93e4508f60adca412c7d861774530c24448ca
        // input[0] burned the group token. output[1] paid the child elsewhere.
        const tokenId =
            'f91f45194313550c963d84adefd93e4508f60adca412c7d861774530c24448ca';
        const mockChronik = new MockChronikClient();
        mockChronik.setToken(
            tokenId,
            mockTokenInfo({
                protocol: 'SLP',
                type: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                number: 65,
            }),
        );
        mockChronik.setTx(tokenId, {
            inputs: [
                {
                    outputScript:
                        '76a9145c74314df7fb7124509f6ceca76986a57764d41188ac',
                    token: {
                        tokenId:
                            '04311f17fe204e501a38b5c296381e4f4824f504337659127f21722c4bde42e0',
                        isMintBaton: false,
                        atoms: 1n,
                    },
                },
                {
                    outputScript:
                        '76a9145c74314df7fb7124509f6ceca76986a57764d41188ac',
                },
            ],
            outputs: [
                { outputScript: '6a04534c50', sats: 0n },
                {
                    outputScript:
                        '76a91470ad03ada7230ea58fc4b00a731a02e3dfdfd6cb88ac',
                    token: {
                        tokenId,
                        isMintBaton: false,
                        atoms: 1n,
                    },
                },
            ],
        } as unknown as Tx);

        assert.deepEqual(
            await getCashtabTokenMetadata(
                mockChronik as unknown as ChronikClient,
                tokenId,
            ),
            {
                tokenId,
                minterAddress:
                    'ecash:qpw8gv2d7lahzfzsnakwefmfs6jhwex5zyfnejs2k6',
                tokenType: 'SLP_TOKEN_TYPE_NFT1_CHILD',
                supplyType: 'FIXED',
            },
        );
    });
    it('getCashtabTokenMetadata returns VARIABLE supply when a mint baton is present', async function () {
        const mockChronik = new MockChronikClient();
        mockChronik.setToken(TEST_TOKEN_ID, mockTokenInfo(ALP_STANDARD));
        mockChronik.setTx(TEST_TOKEN_ID, {
            inputs: [input0(TEST_MINTER_ADDRESS)],
            outputs: [
                {
                    outputScript:
                        getOutputScriptFromAddress(OTHER_MINTER_ADDRESS),
                    token: {
                        tokenId: TEST_TOKEN_ID,
                        isMintBaton: false,
                        atoms: 10000n,
                    },
                },
                {
                    outputScript:
                        getOutputScriptFromAddress(OTHER_MINTER_ADDRESS),
                    token: {
                        tokenId: TEST_TOKEN_ID,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                },
            ],
        } as Tx);

        assert.deepEqual(
            await getCashtabTokenMetadata(
                mockChronik as unknown as ChronikClient,
                TEST_TOKEN_ID,
            ),
            {
                tokenId: TEST_TOKEN_ID,
                minterAddress: TEST_MINTER_ADDRESS,
                tokenType: 'ALP_TOKEN_TYPE_STANDARD',
                supplyType: 'VARIABLE',
            },
        );
    });
    it('getCashtabTokenMetadata uses input[0] for mint vault tokens', async function () {
        const mockChronik = new MockChronikClient();
        mockChronik.setToken(TEST_TOKEN_ID, mockTokenInfo(SLP_MINT_VAULT));
        mockChronik.setTx(TEST_TOKEN_ID, {
            inputs: [
                {
                    outputScript:
                        getOutputScriptFromAddress(TEST_MINTER_ADDRESS),
                },
            ],
            outputs: [],
        } as Tx);

        assert.deepEqual(
            await getCashtabTokenMetadata(
                mockChronik as unknown as ChronikClient,
                TEST_TOKEN_ID,
            ),
            {
                tokenId: TEST_TOKEN_ID,
                minterAddress: TEST_MINTER_ADDRESS,
                tokenType: 'SLP_TOKEN_TYPE_MINT_VAULT',
                supplyType: 'VARIABLE',
            },
        );
    });
    it('getCashtabTokenMetadata keeps input[0] when the only token output is a mint baton', async function () {
        const mockChronik = new MockChronikClient();
        mockChronik.setToken(TEST_TOKEN_ID, mockTokenInfo(ALP_STANDARD));
        mockChronik.setTx(TEST_TOKEN_ID, {
            inputs: [input0(TEST_MINTER_ADDRESS)],
            outputs: [
                {
                    outputScript:
                        getOutputScriptFromAddress(OTHER_MINTER_ADDRESS),
                    token: {
                        tokenId: TEST_TOKEN_ID,
                        isMintBaton: true,
                        atoms: 0n,
                    },
                },
            ],
        } as Tx);

        assert.deepEqual(
            await getCashtabTokenMetadata(
                mockChronik as unknown as ChronikClient,
                TEST_TOKEN_ID,
            ),
            {
                tokenId: TEST_TOKEN_ID,
                minterAddress: TEST_MINTER_ADDRESS,
                tokenType: 'ALP_TOKEN_TYPE_STANDARD',
                supplyType: 'VARIABLE',
            },
        );
    });
    it('getCashtabTokenMetadata throws if genesis has no token outputs', async function () {
        const mockChronik = new MockChronikClient();
        mockChronik.setToken(TEST_TOKEN_ID, mockTokenInfo(ALP_STANDARD));
        mockChronik.setTx(TEST_TOKEN_ID, {
            inputs: [input0(TEST_MINTER_ADDRESS)],
            outputs: [],
        } as unknown as Tx);

        await assert.rejects(
            getCashtabTokenMetadata(
                mockChronik as unknown as ChronikClient,
                TEST_TOKEN_ID,
            ),
            /No genesis supply or mint baton output found/,
        );
    });
    it('getCashtabTokenMetadataWithRetry returns on the first success', async function () {
        const mockChronik = new MockChronikClient();
        mockChronik.setToken(TEST_TOKEN_ID, mockTokenInfo(ALP_STANDARD));
        mockChronik.setTx(TEST_TOKEN_ID, {
            inputs: [input0(TEST_MINTER_ADDRESS)],
            outputs: [
                {
                    outputScript:
                        getOutputScriptFromAddress(TEST_MINTER_ADDRESS),
                    token: {
                        tokenId: TEST_TOKEN_ID,
                        isMintBaton: false,
                        atoms: 1n,
                    },
                },
            ],
        } as Tx);

        const metadata = await getCashtabTokenMetadataWithRetry(
            mockChronik as unknown as ChronikClient,
            TEST_TOKEN_ID,
            { attempts: 1, delayMs: 0 },
        );
        assert.equal(metadata.minterAddress, TEST_MINTER_ADDRESS);
    });
    it('getCashtabTokenMetadataWithRetry throws after exhausted attempts', async function () {
        const mockChronik = new MockChronikClient();
        mockChronik.setToken(TEST_TOKEN_ID, new Error('Token not found'));

        await assert.rejects(
            getCashtabTokenMetadataWithRetry(
                mockChronik as unknown as ChronikClient,
                TEST_TOKEN_ID,
                { attempts: 2, delayMs: 0 },
            ),
            /Token not found/,
        );
    });
});
