// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import {
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    Ecc,
    Script,
    shaRmd160,
    UnsignedTx,
} from 'ecash-lib';

import {
    contributionToComponents,
    type WireFuelInput,
    type WireTokenInput,
} from '../../src/protocol/components.js';
import { initProto } from '../../src/protocol/messages.js';
import { estimateAlpSendFeeSats } from '../../src/tx/assemble.js';
import {
    applyCovertSignature,
    assembleFromComponents,
    assertOwnOutputsPresent,
    prevOutsFromContribution,
    signOwnedInputs,
} from '../../src/tx/sign.js';
import type { FusionTokenOutput } from '../../src/tx/types.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const ecc = new Ecc();

function keypair(tag: number): { sk: Uint8Array; pubkey: Uint8Array } {
    const sk = Buffer.alloc(32);
    sk.writeUInt32BE(tag + 1, 28);
    return { sk, pubkey: ecc.derivePubkey(sk) };
}

function scriptFromPub(pk: Uint8Array): Script {
    return Script.p2pkh(shaRmd160(pk));
}

function tokenIn(outIdx: number, atoms: bigint, tag: number): WireTokenInput {
    const key = keypair(tag);
    return {
        prevOut: { txid: '11'.repeat(32), outIdx },
        sats: DEFAULT_DUST_SATS,
        script: scriptFromPub(key.pubkey),
        tokenId: TOKEN_ID,
        atoms,
        pubkey: key.pubkey,
        sk: key.sk,
    };
}

function tokenOut(atoms: bigint, tag: number): FusionTokenOutput {
    return { script: scriptFromPub(keypair(tag).pubkey), atoms };
}

function fundFuel(
    tokenInputs: WireTokenInput[],
    tokenOutputs: FusionTokenOutput[],
    tag: number,
): WireFuelInput[] {
    const key = keypair(tag);
    const placeholder = {
        prevOut: { txid: '22'.repeat(32), outIdx: 0 },
        sats: 1n,
        script: scriptFromPub(key.pubkey),
        atoms: 0n,
    };
    const { feeSats } = estimateAlpSendFeeSats({
        tokenId: TOKEN_ID,
        tokenInputs,
        tokenOutputs,
        fuelInputs: [placeholder],
        feePerKb: DEFAULT_FEE_SATS_PER_KB,
    });
    const outSats = BigInt(tokenOutputs.length) * DEFAULT_DUST_SATS;
    const inSats = BigInt(tokenInputs.length) * DEFAULT_DUST_SATS;
    return [
        {
            prevOut: { txid: '22'.repeat(32), outIdx: 0 },
            sats: outSats + feeSats - inSats,
            script: scriptFromPub(key.pubkey),
            atoms: 0n,
            pubkey: key.pubkey,
            sk: key.sk,
        },
    ];
}

describe('assembleFromComponents + covert signatures', () => {
    before(async () => {
        await initProto();
    });

    it('reconstructs the same tx and accepts owned Schnorr sigs', () => {
        const aIn = tokenIn(0, 40n, 0xa1);
        const bIn = tokenIn(1, 60n, 0xa2);
        const outs = [tokenOut(40n, 0xb1), tokenOut(60n, 0xb2)];
        const fuel = fundFuel([aIn, bIn], outs, 0xcc);
        const blobs = [
            ...contributionToComponents({
                tokenInputs: [aIn],
                tokenOutputs: [outs[0]],
                fuelInputs: fuel,
            }),
            ...contributionToComponents({
                tokenInputs: [bIn],
                tokenOutputs: [outs[1]],
            }),
        ];
        const { assembled, pubkeys } = assembleFromComponents(
            TOKEN_ID,
            blobs,
            DEFAULT_FEE_SATS_PER_KB,
        );
        expect(pubkeys).to.have.length(assembled.tx.inputs.length);
        const again = assembleFromComponents(
            TOKEN_ID,
            blobs,
            DEFAULT_FEE_SATS_PER_KB,
        );
        expect(
            Buffer.from(again.assembled.tx.ser()).equals(
                Buffer.from(assembled.tx.ser()),
            ),
        ).to.equal(true);
        assertOwnOutputsPresent(assembled, {
            tokenOutputs: [outs[0]],
        });
        assertOwnOutputsPresent(assembled, {
            tokenOutputs: [outs[1]],
        });

        const owned = signOwnedInputs(
            assembled.tx,
            [
                { sk: aIn.sk!, pubkey: aIn.pubkey },
                { sk: bIn.sk!, pubkey: bIn.pubkey },
                { sk: fuel[0].sk!, pubkey: fuel[0].pubkey },
            ],
            prevOutsFromContribution({
                tokenInputs: [aIn, bIn],
                fuelInputs: fuel,
            }),
        );
        expect(owned).to.have.length(assembled.tx.inputs.length);
        const unsigned = UnsignedTx.fromTx(assembled.tx);
        for (const sig of owned) {
            applyCovertSignature(
                assembled.tx,
                unsigned,
                sig.whichInput,
                sig.signature,
                pubkeys[sig.whichInput],
            );
        }
        expect(
            assembled.tx.inputs.every(
                inp => (inp.script?.bytecode.length ?? 0) > 0,
            ),
        ).to.equal(true);
    });

    it('does not sign a same-script input outside ownPrevOuts', () => {
        const aIn = tokenIn(0, 40n, 0xa5);
        const extra = tokenIn(1, 60n, 0xa5);
        const outs = [tokenOut(40n, 0xb5), tokenOut(60n, 0xb6)];
        const fuel = fundFuel([aIn, extra], outs, 0xce);
        const blobs = contributionToComponents({
            tokenInputs: [aIn, extra],
            tokenOutputs: outs,
            fuelInputs: fuel,
        });
        const { assembled } = assembleFromComponents(
            TOKEN_ID,
            blobs,
            DEFAULT_FEE_SATS_PER_KB,
        );
        const owned = signOwnedInputs(
            assembled.tx,
            [{ sk: aIn.sk!, pubkey: aIn.pubkey }],
            prevOutsFromContribution({ tokenInputs: [aIn] }),
        );
        expect(owned).to.have.length(1);
        expect(
            assembled.tx.inputs[owned[0].whichInput].prevOut.outIdx,
        ).to.equal(0);
    });

    it('rejects a contributed output missing from the assembled tx', () => {
        const aIn = tokenIn(0, 40n, 0xa6);
        const bIn = tokenIn(1, 60n, 0xa7);
        const outs = [tokenOut(40n, 0xb7), tokenOut(60n, 0xb8)];
        const fuel = fundFuel([aIn, bIn], outs, 0xcf);
        const blobs = [
            ...contributionToComponents({
                tokenInputs: [aIn],
                tokenOutputs: [outs[0]],
                fuelInputs: fuel,
            }),
            ...contributionToComponents({
                tokenInputs: [bIn],
                tokenOutputs: [outs[1]],
            }),
        ];
        const { assembled } = assembleFromComponents(
            TOKEN_ID,
            blobs,
            DEFAULT_FEE_SATS_PER_KB,
        );
        expect(() =>
            assertOwnOutputsPresent(assembled, {
                tokenOutputs: [tokenOut(40n, 0xb9)],
            }),
        ).to.throw(/missing contributed output/);
        expect(() =>
            assertOwnOutputsPresent(assembled, {
                tokenOutputs: [{ script: outs[0].script, atoms: 1n }],
            }),
        ).to.throw(/missing contributed output/);
        expect(() =>
            assertOwnOutputsPresent(assembled, {
                tokenOutputs: [outs[0], outs[0]],
            }),
        ).to.throw(/missing contributed output/);
    });

    it('rejects a dummy 64-byte signature', () => {
        const aIn = tokenIn(2, 50n, 0xa3);
        const bIn = tokenIn(3, 50n, 0xa4);
        const outs = [tokenOut(50n, 0xb3), tokenOut(50n, 0xb4)];
        const fuel = fundFuel([aIn, bIn], outs, 0xcd);
        const blobs = [
            ...contributionToComponents({
                tokenInputs: [aIn],
                tokenOutputs: [outs[0]],
                fuelInputs: fuel,
            }),
            ...contributionToComponents({
                tokenInputs: [bIn],
                tokenOutputs: [outs[1]],
            }),
        ];
        const { assembled, pubkeys } = assembleFromComponents(
            TOKEN_ID,
            blobs,
            DEFAULT_FEE_SATS_PER_KB,
        );
        expect(() =>
            applyCovertSignature(
                assembled.tx,
                UnsignedTx.fromTx(assembled.tx),
                0,
                new Uint8Array(64),
                pubkeys[0],
            ),
        ).to.throw();
    });
});
