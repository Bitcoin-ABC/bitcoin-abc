// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { Pool } from 'pg';
import {
    countBlacklistedTokensByMinterAddress,
    countTokensByMinterAddress,
    upsertCashtabToken,
} from './cashtabTokens';
import { insertBlacklistEntry } from './db';
import { createTestPool } from '../test/testDb';

const TEST_MINTER_ADDRESS = 'ecash:qpm2qsznhks23z7629mms6s4cwef74vcwva87rkuu2';
const OTHER_MINTER_ADDRESS = 'ecash:qr6lws9uwmjkkaau4w956lugs9nlg9hudqs26lyxkv';

describe('cashtabTokens.ts', function () {
    let testPool: Pool;

    beforeEach(async function () {
        testPool = await createTestPool();
    });

    it('countTokensByMinterAddress returns token count for a minter', async function () {
        await upsertCashtabToken(testPool, {
            tokenId:
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            minterAddress: TEST_MINTER_ADDRESS,
            tokenType: 'ALP_TOKEN_TYPE_STANDARD',
            supplyType: 'FIXED',
        });
        await upsertCashtabToken(testPool, {
            tokenId:
                'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            minterAddress: TEST_MINTER_ADDRESS,
            tokenType: 'SLP_TOKEN_TYPE_FUNGIBLE',
            supplyType: 'VARIABLE',
        });
        await upsertCashtabToken(testPool, {
            tokenId:
                'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
            minterAddress: OTHER_MINTER_ADDRESS,
            tokenType: 'ALP_TOKEN_TYPE_STANDARD',
            supplyType: 'FIXED',
        });

        assert.equal(
            await countTokensByMinterAddress(testPool, TEST_MINTER_ADDRESS),
            2,
        );
        assert.equal(
            await countTokensByMinterAddress(testPool, OTHER_MINTER_ADDRESS),
            1,
        );
    });

    it('countBlacklistedTokensByMinterAddress counts only blacklisted tokens for a minter', async function () {
        const blacklistedTokenId =
            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        const otherTokenId =
            'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

        await upsertCashtabToken(testPool, {
            tokenId: blacklistedTokenId,
            minterAddress: TEST_MINTER_ADDRESS,
            tokenType: 'ALP_TOKEN_TYPE_STANDARD',
            supplyType: 'FIXED',
        });
        await upsertCashtabToken(testPool, {
            tokenId: otherTokenId,
            minterAddress: TEST_MINTER_ADDRESS,
            tokenType: 'SLP_TOKEN_TYPE_FUNGIBLE',
            supplyType: 'VARIABLE',
        });
        await insertBlacklistEntry(testPool, blacklistedTokenId, {
            reason: 'test',
            timestamp: 1,
            addedBy: 'test',
        });

        assert.equal(
            await countBlacklistedTokensByMinterAddress(
                testPool,
                TEST_MINTER_ADDRESS,
            ),
            1,
        );
    });
});
