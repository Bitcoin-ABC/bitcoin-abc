// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import {
    BlindSigner,
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    Ecc,
    finalizeBlindSigs,
    randomScalarBytes,
    Script,
    sha256,
    shaRmd160,
} from 'ecash-lib';

import {
    contributionToComponents,
    DUMMY_POINT,
    type WireContribution,
} from '../../src/protocol/components.js';
import {
    buildPlayerCommit,
    componentFee,
    sizeOfInput,
    sizeOfOutput,
    readBlindSigScalars,
    verifyCovertComponent,
    verifyPlayerCommit,
} from '../../src/protocol/commit.js';
import {
    encodeInitialCommitment,
    initProto,
} from '../../src/protocol/messages.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function dummyPubkey(tag: number): Buffer {
    const pk = Buffer.alloc(33, tag);
    pk[0] = 0x02;
    return pk;
}

describe('component fee helpers', () => {
    it('matches Electrum size_of_input / size_of_output / component_fee', () => {
        const pk = dummyPubkey(0xa1);
        expect(sizeOfInput(pk)).to.equal(141);
        expect(sizeOfOutput(Script.p2pkh(shaRmd160(pk)).bytecode)).to.equal(34);
        expect(componentFee(141, 1000n)).to.equal(141n);
        expect(componentFee(34, 1000n)).to.equal(34n);
        expect(componentFee(1, 1000n)).to.equal(1n);
    });
});

describe('buildPlayerCommit / verifyPlayerCommit', () => {
    before(async () => {
        await initProto();
    });

    function conserved(): WireContribution {
        const pkIn = dummyPubkey(0xa1);
        const pkOut = dummyPubkey(0xb1);
        return {
            tokenInputs: [
                {
                    prevOut: { txid: '11'.repeat(32), outIdx: 0 },
                    sats: DEFAULT_DUST_SATS,
                    script: Script.p2pkh(shaRmd160(pkIn)),
                    tokenId: TOKEN_ID,
                    atoms: 40n,
                    pubkey: pkIn,
                },
            ],
            tokenOutputs: [
                {
                    script: Script.p2pkh(shaRmd160(pkOut)),
                    atoms: 40n,
                    sats: DEFAULT_DUST_SATS,
                },
            ],
        };
    }

    it('roundtrips dual Pedersen and unblinds a covert signature', () => {
        const components = contributionToComponents(conserved());
        const ecc = new Ecc();
        const seckey = randomScalarBytes();
        const roundPubkey = ecc.derivePubkey(seckey);
        const blinds = components.map(() => new BlindSigner());
        const built = buildPlayerCommit(
            components,
            roundPubkey,
            blinds.map(b => b.getR()),
            DEFAULT_FEE_SATS_PER_KB,
        );
        const verified = verifyPlayerCommit(
            {
                initialCommitments: built.initialCommitments,
                excessFee: built.excessFee,
                satsPedersenTotalNonce: built.satsPedersenTotalNonce,
                tokenPedersenTotalNonce: built.tokenPedersenTotalNonce,
                randomNumberCommitment: built.randomNumberCommitment,
                blindSigRequests: built.blindSigRequests,
            },
            {
                minExcessFee: -1_000_000n,
                maxExcessFee: 1_000_000n,
                maxComponents: 23,
            },
        );
        expect(verified.hashes).to.deep.equal(built.hashes);
        const scalars = verified.eValues.map((e, i) =>
            blinds[i].sign(seckey, e),
        );
        const sigs = finalizeBlindSigs(built.requests, scalars);
        const component = verifyCovertComponent(
            {
                roundPubkey,
                signature: sigs[0],
                component: components[0],
            },
            roundPubkey,
        );
        expect(Buffer.from(component).equals(components[0])).to.equal(true);
    });

    it('rejects dummy Pedersen points', () => {
        const components = contributionToComponents(conserved());
        const commKey = Buffer.alloc(33, 3);
        commKey[0] = 0x02;
        expect(() =>
            verifyPlayerCommit(
                {
                    initialCommitments: components.map(c =>
                        encodeInitialCommitment({
                            saltedComponentHash: Buffer.from(sha256(c)),
                            satsCommitment: DUMMY_POINT,
                            tokenCommitment: DUMMY_POINT,
                            communicationKey: commKey,
                        }),
                    ),
                    excessFee: 0n,
                    satsPedersenTotalNonce: Buffer.alloc(32, 1),
                    tokenPedersenTotalNonce: Buffer.alloc(32, 2),
                    randomNumberCommitment: Buffer.alloc(32, 3),
                    blindSigRequests: components.map(() => Buffer.alloc(32, 4)),
                },
                {
                    minExcessFee: 0n,
                    maxExcessFee: 300_000n,
                    maxComponents: 23,
                },
            ),
        ).to.throw(/Pedersen/);
    });

    it('rejects a burned token contribution at build time', () => {
        const pkIn = dummyPubkey(0xa1);
        const pkOut = dummyPubkey(0xb1);
        const burned: WireContribution = {
            tokenInputs: [
                {
                    prevOut: { txid: '11'.repeat(32), outIdx: 0 },
                    sats: DEFAULT_DUST_SATS,
                    script: Script.p2pkh(shaRmd160(pkIn)),
                    tokenId: TOKEN_ID,
                    atoms: 50n,
                    pubkey: pkIn,
                },
            ],
            tokenOutputs: [
                {
                    script: Script.p2pkh(shaRmd160(pkOut)),
                    atoms: 40n,
                    sats: DEFAULT_DUST_SATS,
                },
            ],
        };
        const components = contributionToComponents(burned);
        const ecc = new Ecc();
        const seckey = randomScalarBytes();
        expect(() =>
            buildPlayerCommit(
                components,
                ecc.derivePubkey(seckey),
                components.map(() => new BlindSigner().getR()),
                DEFAULT_FEE_SATS_PER_KB,
            ),
        ).to.throw(/not conserved/);
    });

    it('rejects a BlindSigResponses scalar count mismatch', () => {
        expect(() => readBlindSigScalars([Buffer.alloc(32)], 2)).to.throw(
            /expected 2, got 1/,
        );
        expect(
            readBlindSigScalars([Buffer.alloc(32, 1)], 1)[0].length,
        ).to.equal(32);
    });

    it('rejects a dummy covert signature', () => {
        const components = contributionToComponents(conserved());
        const roundPubkey = new Ecc().derivePubkey(randomScalarBytes());
        expect(() =>
            verifyCovertComponent(
                {
                    roundPubkey,
                    signature: Buffer.alloc(64, 1),
                    component: components[0],
                },
                roundPubkey,
            ),
        ).to.throw();
    });
});
