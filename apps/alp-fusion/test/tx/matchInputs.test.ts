// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { Ecc, Script, shaRmd160 } from 'ecash-lib';

import { contributionToComponents } from '../../src/protocol/components.js';
import type {
    WireContribution,
    WireFuelInput,
    WireTokenInput,
} from '../../src/protocol/components.js';
import { initProto } from '../../src/protocol/messages.js';
import {
    assertFusionInputsMatchChain,
    type FusionChain,
    type FusionChainOutput,
    type FusionChainToken,
} from '../../src/tx/matchInputs.js';
import type { FusionTokenOutput } from '../../src/tx/types.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const OTHER_TOKEN_ID =
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

const ALP = { protocol: 'ALP' as const };

const ecc = new Ecc();

function keypair(tag: number): { sk: Uint8Array; pubkey: Uint8Array } {
    const sk = new Uint8Array(32);
    sk[31] = tag;
    return { sk, pubkey: ecc.derivePubkey(sk) };
}

function scriptFromPub(pubkey: Uint8Array): Script {
    return Script.p2pkh(shaRmd160(pubkey));
}

function tokenOf(atoms: bigint, tokenId = TOKEN_ID): FusionChainToken {
    return {
        tokenId,
        tokenType: ALP,
        atoms,
        isMintBaton: false,
    };
}

function tokenIn(atoms: bigint, sats: bigint): WireTokenInput {
    const { sk, pubkey } = keypair(1);
    return {
        prevOut: { txid: 'aa'.repeat(32), outIdx: 0 },
        sats,
        script: scriptFromPub(pubkey),
        tokenId: TOKEN_ID,
        atoms,
        pubkey,
        sk,
    };
}

function fuelIn(sats: bigint): WireFuelInput {
    const { sk, pubkey } = keypair(2);
    return {
        prevOut: { txid: 'bb'.repeat(32), outIdx: 1 },
        sats,
        script: scriptFromPub(pubkey),
        atoms: 0n,
        pubkey,
        sk,
    };
}

function tokenOut(atoms: bigint): FusionTokenOutput {
    return { script: scriptFromPub(keypair(3).pubkey), atoms };
}

function blobs(contrib: WireContribution): Buffer[] {
    return contributionToComponents(contrib);
}

function chainOf(
    rows: { txid: string; outIdx: number; output: FusionChainOutput }[],
): FusionChain {
    return {
        tx: async (txid: string) => ({
            outputs: rows
                .filter(row => row.txid === txid)
                .reduce<FusionChainOutput[]>((outputs, row) => {
                    outputs[row.outIdx] = row.output;
                    return outputs;
                }, []),
        }),
    };
}

async function expectReject(
    contrib: WireContribution,
    chronik: FusionChain,
    pattern: RegExp,
): Promise<void> {
    let threw: Error | undefined;
    try {
        await assertFusionInputsMatchChain(chronik, TOKEN_ID, blobs(contrib));
    } catch (err) {
        threw = err as Error;
    }
    expect(threw?.message).to.match(pattern);
}

describe('assertFusionInputsMatchChain', () => {
    before(async () => {
        await initProto();
    });

    it('accepts token and fuel inputs that match Chronik', async () => {
        const contrib: WireContribution = {
            tokenInputs: [tokenIn(40n, 546n)],
            tokenOutputs: [tokenOut(40n)],
            fuelInputs: [fuelIn(10_000n)],
        };
        await assertFusionInputsMatchChain(
            chainOf([
                {
                    txid: 'aa'.repeat(32),
                    outIdx: 0,
                    output: { sats: 546n, token: tokenOf(40n) },
                },
                {
                    txid: 'bb'.repeat(32),
                    outIdx: 1,
                    output: { sats: 10_000n },
                },
            ]),
            TOKEN_ID,
            blobs(contrib),
        );
    });

    it('rejects an over-claimed atom count', async () => {
        const contrib: WireContribution = {
            tokenInputs: [tokenIn(100n, 546n)],
            tokenOutputs: [tokenOut(100n)],
        };
        await expectReject(
            contrib,
            chainOf([
                {
                    txid: 'aa'.repeat(32),
                    outIdx: 0,
                    output: { sats: 546n, token: tokenOf(40n) },
                },
            ]),
            /claimed 100 atoms, chain has ALP .* 40 atoms/,
        );
    });

    it('rejects a dust output claimed as a token input', async () => {
        const contrib: WireContribution = {
            tokenInputs: [tokenIn(100n, 546n)],
            tokenOutputs: [tokenOut(100n)],
        };
        await expectReject(
            contrib,
            chainOf([
                {
                    txid: 'aa'.repeat(32),
                    outIdx: 0,
                    output: { sats: 546n },
                },
            ]),
            /claimed 100 atoms, chain has no token/,
        );
    });

    it('rejects a token UTXO labeled as fuel', async () => {
        const contrib: WireContribution = {
            tokenInputs: [tokenIn(40n, 546n)],
            tokenOutputs: [tokenOut(40n)],
            fuelInputs: [fuelIn(10_000n)],
        };
        await expectReject(
            contrib,
            chainOf([
                {
                    txid: 'aa'.repeat(32),
                    outIdx: 0,
                    output: { sats: 546n, token: tokenOf(40n) },
                },
                {
                    txid: 'bb'.repeat(32),
                    outIdx: 1,
                    output: { sats: 10_000n, token: tokenOf(7n) },
                },
            ]),
            /fuel output carries ALP .* 7 atoms/,
        );
    });

    it('rejects a spent output, a sat lie, and a missing output', async () => {
        const contrib: WireContribution = {
            tokenInputs: [tokenIn(40n, 546n)],
            tokenOutputs: [tokenOut(40n)],
        };
        const txid = 'aa'.repeat(32);
        await expectReject(
            contrib,
            chainOf([
                {
                    txid,
                    outIdx: 0,
                    output: {
                        sats: 546n,
                        token: tokenOf(40n),
                        spentBy: { txid: 'cc'.repeat(32), outIdx: 0 },
                    },
                },
            ]),
            /output is spent/,
        );
        await expectReject(
            contrib,
            chainOf([
                {
                    txid,
                    outIdx: 0,
                    output: { sats: 100n, token: tokenOf(40n) },
                },
            ]),
            /claimed 546 sats, chain has 100/,
        );
        await expectReject(contrib, chainOf([]), /output not found/);
    });

    it('rejects a mint baton and a different token id', async () => {
        const contrib: WireContribution = {
            tokenInputs: [tokenIn(40n, 546n)],
            tokenOutputs: [tokenOut(40n)],
        };
        const txid = 'aa'.repeat(32);
        await expectReject(
            contrib,
            chainOf([
                {
                    txid,
                    outIdx: 0,
                    output: {
                        sats: 546n,
                        token: { ...tokenOf(40n), isMintBaton: true },
                    },
                },
            ]),
            /mint baton/,
        );
        await expectReject(
            contrib,
            chainOf([
                {
                    txid,
                    outIdx: 0,
                    output: { sats: 546n, token: tokenOf(40n, OTHER_TOKEN_ID) },
                },
            ]),
            new RegExp(OTHER_TOKEN_ID),
        );
    });

    it('wraps a Chronik lookup failure', async () => {
        const contrib: WireContribution = {
            tokenInputs: [tokenIn(40n, 546n)],
            tokenOutputs: [tokenOut(40n)],
        };
        await expectReject(
            contrib,
            {
                tx: async () => {
                    throw new Error('offline');
                },
            },
            /offline/,
        );
    });
});
