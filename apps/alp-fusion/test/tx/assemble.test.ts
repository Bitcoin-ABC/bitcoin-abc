// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import {
    ALP_POLICY_MAX_OUTPUTS,
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    fromHex,
    fromHexRev,
    OP_RETURN_MAX_BYTES,
    parseAlp,
    parseEmppScript,
    Script,
    SEND_STR,
} from 'ecash-lib';

import {
    assembleAlpSend,
    estimateAlpSendFeeSats,
    validateAlpSendAssembly,
} from '../../src/tx/assemble.js';
import type {
    AssembleAlpSendParams,
    FusionFuelInput,
    FusionTokenInput,
    FusionTokenOutput,
} from '../../src/tx/types.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const OTHER_TOKEN_ID =
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

function p2pkh(byte: number): Script {
    return Script.p2pkh(fromHex(byte.toString(16).padStart(2, '0').repeat(20)));
}

function tokenInput(
    outIdx: number,
    atoms: bigint,
    sats = DEFAULT_DUST_SATS,
    tokenId = TOKEN_ID,
): FusionTokenInput {
    return {
        prevOut: { txid: '11'.repeat(32), outIdx },
        sats,
        script: p2pkh(0xaa),
        tokenId,
        atoms,
    };
}

function tokenOutput(atoms: bigint, byte = 0xbb): FusionTokenOutput {
    return { script: p2pkh(byte), atoms };
}

function fuelInput(sats: bigint, outIdx = 0): FusionFuelInput {
    return {
        prevOut: { txid: '22'.repeat(32), outIdx },
        sats,
        script: p2pkh(0xcc),
        atoms: 0n,
    };
}

/** Fund fuel so inputSats - outputSats equals the Schnorr-P2PKH fee estimate. */
function withFundedFuel(
    params: Omit<AssembleAlpSendParams, 'fuelInputs'> & {
        fuelInputs?: AssembleAlpSendParams['fuelInputs'];
    },
): AssembleAlpSendParams {
    const feePerKb = params.feePerKb ?? DEFAULT_FEE_SATS_PER_KB;
    const dustSats = params.dustSats ?? DEFAULT_DUST_SATS;
    const tokenOutputs = params.tokenOutputs;
    const xecOutputs = params.xecOutputs ?? [];
    const outputSats =
        tokenOutputs.reduce((a, o) => a + (o.sats ?? dustSats), 0n) +
        xecOutputs.reduce((a, o) => a + o.sats, 0n);
    const tokenInSats = params.tokenInputs.reduce((a, i) => a + i.sats, 0n);

    const shaped: AssembleAlpSendParams = {
        ...params,
        feePerKb,
        fuelInputs: [fuelInput(1n)],
    };
    const { feeSats } = estimateAlpSendFeeSats(shaped);
    const fuelSats = outputSats + feeSats - tokenInSats;
    expect(fuelSats > 0n).to.equal(true);
    return {
        ...shaped,
        fuelInputs: [fuelInput(fuelSats)],
    };
}

function baseParams(
    overrides: Partial<AssembleAlpSendParams> = {},
): AssembleAlpSendParams {
    return withFundedFuel({
        tokenId: TOKEN_ID,
        tokenInputs: [tokenInput(0, 40n), tokenInput(1, 60n)],
        tokenOutputs: [
            tokenOutput(17n, 0xb1),
            tokenOutput(31n, 0xb2),
            tokenOutput(52n, 0xb3),
        ],
        ...overrides,
    });
}

describe('assembleAlpSend', () => {
    it('builds EMPP SEND with conserved atoms; fee from feePerKb × signed size', () => {
        const params = baseParams();
        const assembled = assembleAlpSend(params);
        expect(assembled.inputAtoms).to.equal(100n);
        expect(assembled.outputAtoms).to.equal(100n);
        expect(assembled.sendAtomsArray).to.deep.equal([17n, 31n, 52n]);
        expect(assembled.feePerKb).to.equal(DEFAULT_FEE_SATS_PER_KB);
        expect(assembled.inputSats - assembled.outputSats).to.equal(
            assembled.feeSats,
        );
        expect(assembled.signedSerSize).to.be.greaterThan(
            assembled.tx.serSize(),
        );

        const tx = assembled.tx;
        expect(tx.outputs.length).to.equal(4); // OP_RETURN + 3 token
        expect(tx.outputs[0].sats).to.equal(0n);
        expect(tx.outputs[0].script.bytecode.length).to.be.at.most(
            OP_RETURN_MAX_BYTES,
        );

        const pushes = parseEmppScript(tx.outputs[0].script);
        expect(pushes).to.not.equal(undefined);
        expect(pushes!.length).to.equal(1);
        const alp = parseAlp(pushes![0]);
        expect(alp?.txType).to.equal(SEND_STR);
        if (alp?.txType !== SEND_STR) {
            throw new Error('expected SEND');
        }
        expect(alp.tokenId).to.equal(TOKEN_ID);
        expect(alp.sendAtomsArray).to.deep.equal([17n, 31n, 52n]);

        for (let i = 0; i < 3; i++) {
            expect(tx.outputs[i + 1].sats).to.equal(DEFAULT_DUST_SATS);
        }
        for (const inp of tx.inputs) {
            expect(
                inp.script === undefined || inp.script.bytecode.length === 0,
            ).to.equal(true);
        }
        expect(tx.ser().length).to.be.greaterThan(0);
    });

    it('appends uncolored XEC outputs after token outs', () => {
        const tokenOutputs = [tokenOutput(100n)];
        const xecScript = p2pkh(0xee);
        const params = withFundedFuel({
            tokenId: TOKEN_ID,
            tokenInputs: [tokenInput(0, 100n)],
            tokenOutputs,
            xecOutputs: [{ script: xecScript, sats: DEFAULT_DUST_SATS }],
        });
        const assembled = assembleAlpSend(params);
        expect(assembled.tx.outputs.length).to.equal(3);
        expect(assembled.tx.outputs[1].script.bytecode).to.deep.equal(
            tokenOutputs[0].script.bytecode,
        );
        expect(assembled.tx.outputs[2].sats).to.equal(DEFAULT_DUST_SATS);
        expect(assembled.tx.outputs[2].script.bytecode).to.deep.equal(
            xecScript.bytecode,
        );
        expect(assembled.sendAtomsArray).to.deep.equal([100n]);
    });

    it('accepts exactly ALP_POLICY_MAX_OUTPUTS token outs', () => {
        const n = ALP_POLICY_MAX_OUTPUTS;
        const tokenOutputs = Array.from({ length: n }, (_, i) =>
            tokenOutput(1n, 0x10 + i),
        );
        const params = withFundedFuel({
            tokenId: TOKEN_ID,
            tokenInputs: [tokenInput(0, BigInt(n))],
            tokenOutputs,
        });
        const assembled = assembleAlpSend(params);
        expect(assembled.tx.outputs.length).to.equal(n + 1);
        expect(assembled.tx.outputs[0].script.bytecode.length).to.be.at.most(
            OP_RETURN_MAX_BYTES,
        );
        const pushes = parseEmppScript(assembled.tx.outputs[0].script);
        expect(pushes).to.not.equal(undefined);
        const alp = parseAlp(pushes![0]);
        expect(alp?.txType).to.equal(SEND_STR);
        if (alp?.txType !== SEND_STR) {
            throw new Error('expected SEND');
        }
        expect(alp.sendAtomsArray).to.deep.equal(
            tokenOutputs.map(output => output.atoms),
        );
    });

    it('rejects more than ALP_POLICY_MAX_OUTPUTS token outs', () => {
        const n = ALP_POLICY_MAX_OUTPUTS + 1;
        const tokenOutputs = Array.from({ length: n }, () => tokenOutput(1n));
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [tokenInput(0, BigInt(n))],
                tokenOutputs,
                fuelInputs: [fuelInput(BigInt(n) * DEFAULT_DUST_SATS)],
            }),
        ).to.throw(/ALP_POLICY_MAX_OUTPUTS/);
    });

    it('rejects mixed tokenIds', () => {
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [
                    tokenInput(0, 50n),
                    tokenInput(1, 50n, DEFAULT_DUST_SATS, OTHER_TOKEN_ID),
                ],
                tokenOutputs: [tokenOutput(100n)],
                fuelInputs: [fuelInput(1000n)],
            }),
        ).to.throw(/does not match params.tokenId/);
    });

    it('rejects atom burn and inflation', () => {
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [tokenInput(0, 40n), tokenInput(1, 60n)],
                tokenOutputs: [tokenOutput(99n)],
                fuelInputs: [fuelInput(1000n)],
            }),
        ).to.throw(/atom burn/);
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [tokenInput(0, 40n), tokenInput(1, 60n)],
                tokenOutputs: [tokenOutput(101n)],
                fuelInputs: [fuelInput(1000n)],
            }),
        ).to.throw(/atom inflation/);
    });

    it('rejects fee mismatch and dust outs', () => {
        const params = baseParams();
        const badFuel = {
            ...params.fuelInputs![0],
            sats: params.fuelInputs![0].sats - 1n,
        };
        expect(() =>
            validateAlpSendAssembly({
                ...params,
                fuelInputs: [badFuel],
            }),
        ).to.throw(/fee mismatch/);
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [{ ...tokenInput(0, 100n), sats: 100n }],
                tokenOutputs: [{ script: p2pkh(1), atoms: 100n, sats: 100n }],
                fuelInputs: [],
            }),
        ).to.throw(/below dust/);
    });

    it('rejects zero-atom output, bad tokenId, duplicate outpoint', () => {
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [tokenInput(0, 100n)],
                tokenOutputs: [tokenOutput(0n)],
                fuelInputs: [fuelInput(1000n)],
            }),
        ).to.throw(/atoms must be > 0/);
        expect(() =>
            validateAlpSendAssembly({
                tokenId: 'abcd',
                tokenInputs: [tokenInput(0, 100n)],
                tokenOutputs: [tokenOutput(100n)],
                fuelInputs: [fuelInput(1000n)],
            }),
        ).to.throw(/64 lowercase hex/);
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [tokenInput(0, 50n), tokenInput(0, 50n)],
                tokenOutputs: [tokenOutput(100n)],
                fuelInputs: [fuelInput(1000n)],
            }),
        ).to.throw(/duplicate outpoint/);
        // Same outpoint as BE hex string vs LE Uint8Array must still collide.
        const beHex = '11'.repeat(32);
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [
                    tokenInput(0, 50n),
                    {
                        ...tokenInput(0, 50n),
                        prevOut: { txid: fromHexRev(beHex), outIdx: 0 },
                    },
                ],
                tokenOutputs: [tokenOutput(100n)],
                fuelInputs: [fuelInput(1000n)],
            }),
        ).to.throw(/duplicate outpoint/);
    });

    it('rejects non-P2PKH input scripts (fee estimate assumes P2PKH)', () => {
        const p2sh = Script.p2sh(fromHex('11'.repeat(20)));
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [
                    {
                        ...tokenInput(0, 100n),
                        script: p2sh,
                    },
                ],
                tokenOutputs: [tokenOutput(100n)],
                fuelInputs: [fuelInput(1000n)],
            }),
        ).to.throw(/tokenInputs\[0\] script must be P2PKH/);
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [tokenInput(0, 100n)],
                tokenOutputs: [tokenOutput(100n)],
                fuelInputs: [
                    {
                        ...fuelInput(1000n),
                        script: p2sh,
                    },
                ],
            }),
        ).to.throw(/fuelInputs\[0\] script must be P2PKH/);
    });

    it('rejects zero-sats token inputs (same as fuel)', () => {
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [{ ...tokenInput(0, 100n), sats: 0n }],
                tokenOutputs: [tokenOutput(100n)],
                fuelInputs: [fuelInput(DEFAULT_DUST_SATS, 1)],
            }),
        ).to.throw(/tokenInputs\[0\] sats must be > 0/);
    });

    it('rejects fuel inputs that carry token atoms', () => {
        expect(() =>
            validateAlpSendAssembly({
                tokenId: TOKEN_ID,
                tokenInputs: [tokenInput(0, 100n)],
                tokenOutputs: [tokenOutput(100n)],
                fuelInputs: [{ ...fuelInput(1000n), atoms: 1n }],
            }),
        ).to.throw(/fuelInputs\[0\] must be pure XEC/);
    });

    it('scales required fee with feePerKb', () => {
        const low = withFundedFuel({
            tokenId: TOKEN_ID,
            tokenInputs: [tokenInput(0, 100n)],
            tokenOutputs: [tokenOutput(100n)],
            feePerKb: 1000n,
        });
        const high = withFundedFuel({
            tokenId: TOKEN_ID,
            tokenInputs: [tokenInput(0, 100n)],
            tokenOutputs: [tokenOutput(100n)],
            feePerKb: 2000n,
        });
        const a = assembleAlpSend(low);
        const b = assembleAlpSend(high);
        expect(b.feeSats).to.equal(a.feeSats * 2n);
        expect(a.signedSerSize).to.equal(b.signedSerSize);
    });
});
