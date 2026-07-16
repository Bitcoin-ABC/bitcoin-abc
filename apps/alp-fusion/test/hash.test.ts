// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { equalBytes, fromHex, strToBytes, toHex } from 'ecash-lib';

import {
    calcRoundHash,
    calcSessionHash,
    listHash,
    parsePoolKey,
    poolKey,
    tokenIdFromBytes,
    tokenIdToBytes,
} from '../src/protocol/hash.js';

describe('hash utilities', () => {
    it('listHash matches a fixed vector and is order-sensitive', () => {
        const a = strToBytes('aaa');
        const b = strToBytes('bb');
        const h1 = listHash([a, b]);
        const h2 = listHash([a, b]);
        const h3 = listHash([b, a]);
        expect(toHex(h1)).to.equal(
            'b4f64c877b576a2e24b3bdab5df0baac8c389430286db5ac842d36f911d5243f',
        );
        expect(equalBytes(h1, h2)).to.equal(true);
        expect(equalBytes(h1, h3)).to.equal(false);
    });

    it('session and round hashes match fixed vectors', () => {
        const tokenId = tokenIdToBytes(
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        );
        const session = calcSessionHash(
            tokenId,
            1000n,
            strToBytes('127.0.0.1'),
            8789,
            1_700_000_000,
        );
        expect(toHex(session)).to.equal(
            'c718445d3fc8268a6e14444f208c81a47abd1a5b02261b470c5a679cbc6b7712',
        );

        const round = calcRoundHash(
            session,
            new Uint8Array(33).fill(0x02),
            1_700_000_100,
            [strToBytes('commit1'), strToBytes('commit2')],
            [strToBytes('comp1'), strToBytes('comp2')],
        );
        expect(toHex(round)).to.equal(
            '059c4652b52ed6893b00d3e645c08931d3c83a8921feac67928d96a15c22b30f',
        );
    });

    it('poolKey roundtrips a non-symmetric tokenId and exact key text', () => {
        const tidHex =
            '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        const tokenId = tokenIdToBytes(tidHex);
        // Reversed bytes must differ from the chronik/txid hex string encoding.
        expect(toHex(tokenId)).to.equal(
            'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301',
        );
        expect(tokenIdFromBytes(tokenId)).to.equal(tidHex);

        const key = poolKey(tokenId, 10000n);
        expect(key).to.equal(
            'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301:10000',
        );
        const parsed = parsePoolKey(key);
        expect(equalBytes(parsed.tokenId, tokenId)).to.equal(true);
        expect(parsed.atomTier).to.equal(10000n);
    });

    it('parsePoolKey and poolKey enforce tokenId/tier bounds', () => {
        expect(() => parsePoolKey('onlyonefield')).to.throw(/expected/);
        expect(() =>
            parsePoolKey(
                'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301:10000:extra',
            ),
        ).to.throw(/expected/);
        expect(() => parsePoolKey('not-hex:1')).to.throw(/64 lowercase/);
        expect(() =>
            parsePoolKey(
                'EFCDAB8967452301EFCDAB8967452301EFCDAB8967452301EFCDAB8967452301:1',
            ),
        ).to.throw(/64 lowercase/);
        expect(() =>
            parsePoolKey(
                'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301:01',
            ),
        ).to.throw(/canonical decimal/);
        expect(() =>
            parsePoolKey(
                'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301:-1',
            ),
        ).to.throw(/canonical decimal/);
        expect(() =>
            parsePoolKey(
                'efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301:18446744073709551616',
            ),
        ).to.throw(/uint64/);
        expect(() =>
            parsePoolKey(
                `efcdab8967452301efcdab8967452301efcdab8967452301efcdab8967452301:${'9'.repeat(40)}`,
            ),
        ).to.throw(/uint64/);

        const tid = new Uint8Array(32).fill(0xab);
        expect(() => poolKey(tid, -1n)).to.throw(/atomTier/);
        expect(() => poolKey(tid, 0x10000000000000000n)).to.throw(/atomTier/);
        expect(() => poolKey(new Uint8Array(31), 1n)).to.throw(/32 bytes/);
        expect(() => tokenIdToBytes('abcd')).to.throw(/64 hex/);
        expect(() => tokenIdFromBytes(new Uint8Array(16))).to.throw(/32 bytes/);
    });

    it('tokenId encoding is reversed txid hex', () => {
        const txid =
            'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';
        const bytes = tokenIdToBytes(txid);
        expect(bytes).to.deep.equal(fromHex(txid).reverse());
        expect(tokenIdFromBytes(bytes)).to.equal(txid);
    });
});
