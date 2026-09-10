// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { Ecc, shaRmd160, toHex } from 'ecash-lib';
import { MockChronikClient } from 'mock-chronik-client';

import {
    broadcastFusionTx,
    loadWireInputsFromChronik,
    type FusionChronik,
} from '../../src/client/chronik.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const OTHER_TOKEN_ID =
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

const ALP = {
    protocol: 'ALP' as const,
    type: 'ALP_TOKEN_TYPE_STANDARD' as const,
    number: 0,
};
const SLP = {
    protocol: 'SLP' as const,
    type: 'SLP_TOKEN_TYPE_FUNGIBLE' as const,
    number: 1,
};

describe('Chronik fusion helpers', () => {
    it('loads token and fuel UTXOs and skips mint batons / other tokens / SLP', async () => {
        const ecc = new Ecc();
        const sk = new Uint8Array(32);
        sk[31] = 0x11;
        const pubkey = ecc.derivePubkey(sk);
        const pkh = toHex(shaRmd160(pubkey));
        const chronik = new MockChronikClient();
        chronik.setUtxosByScript('p2pkh', pkh, [
            {
                outpoint: { txid: 'aa'.repeat(32), outIdx: 0 },
                blockHeight: 100,
                isCoinbase: false,
                sats: 546n,
                isFinal: true,
                token: {
                    tokenId: TOKEN_ID,
                    tokenType: ALP,
                    atoms: 40n,
                    isMintBaton: false,
                },
            },
            {
                outpoint: { txid: 'bb'.repeat(32), outIdx: 1 },
                blockHeight: 100,
                isCoinbase: false,
                sats: 10_000n,
                isFinal: true,
            },
            {
                outpoint: { txid: 'cc'.repeat(32), outIdx: 2 },
                blockHeight: 100,
                isCoinbase: false,
                sats: 546n,
                isFinal: true,
                token: {
                    tokenId: TOKEN_ID,
                    tokenType: ALP,
                    atoms: 1n,
                    isMintBaton: true,
                },
            },
            {
                outpoint: { txid: 'dd'.repeat(32), outIdx: 3 },
                blockHeight: 100,
                isCoinbase: false,
                sats: 546n,
                isFinal: true,
                token: {
                    tokenId: OTHER_TOKEN_ID,
                    tokenType: ALP,
                    atoms: 7n,
                    isMintBaton: false,
                },
            },
            {
                outpoint: { txid: 'ee'.repeat(32), outIdx: 4 },
                blockHeight: 100,
                isCoinbase: false,
                sats: 546n,
                isFinal: true,
                token: {
                    tokenId: TOKEN_ID,
                    tokenType: SLP,
                    atoms: 9n,
                    isMintBaton: false,
                },
            },
        ]);

        const loaded = await loadWireInputsFromChronik(
            chronik as unknown as FusionChronik,
            [{ sk, pubkey }],
            TOKEN_ID,
        );
        expect(loaded.tokenInputs).to.have.length(1);
        expect(loaded.tokenInputs[0].atoms).to.equal(40n);
        expect(loaded.tokenInputs[0].sk).to.equal(sk);
        expect(loaded.fuelInputs).to.have.length(1);
        expect(loaded.fuelInputs[0].sats).to.equal(10_000n);
    });

    it('broadcasts hex that MockChronikClient can look up', async () => {
        const chronik = new MockChronikClient();
        const rawTx = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
        const hex = toHex(rawTx);
        chronik.setBroadcastTx(hex, 'ab'.repeat(32));
        const result = await broadcastFusionTx(chronik, rawTx);
        expect(result.txid).to.equal('ab'.repeat(32));
    });

    it('does not skip Chronik token-burn checks', async () => {
        const seen: Array<boolean | undefined> = [];
        await broadcastFusionTx(
            {
                broadcastTx: async (_raw, skipTokenChecks) => {
                    seen.push(skipTokenChecks);
                    return { txid: 'ab'.repeat(32) };
                },
            },
            new Uint8Array([0x01]),
        );
        expect(seen).to.deep.equal([undefined]);
    });

    it('rejects an empty rawTx', async () => {
        const chronik = new MockChronikClient();
        let threw: Error | undefined;
        try {
            await broadcastFusionTx(chronik, new Uint8Array());
        } catch (err) {
            threw = err as Error;
        }
        expect(threw?.message).to.match(/empty rawTx/);
    });
});
