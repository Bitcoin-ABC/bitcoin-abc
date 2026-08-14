// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import {
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    Script,
    Tx,
    alpBurn,
    alpSend,
    emppScript,
    fromHex,
} from 'ecash-lib';
import { ValidationError } from '../src/methods/errors';
import { SETTLE_BAND_BPS } from '../src/constants';
import {
    assertMakerFeeAtoms,
    parsePartiallySignedSwap,
    type ParsedPartiallySignedSwap,
    validatePartiallySignedTx,
} from '../src/settle/parseSwap';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);
const slushScriptHex = '76a914' + '11'.repeat(20) + '88ac';
const feeScriptHex = '76a914' + '22'.repeat(20) + '88ac';
const sellerScriptHex = '76a914' + '33'.repeat(20) + '88ac';
const buyerScriptHex = '76a914' + '44'.repeat(20) + '88ac';

const baseSwap = (
    overrides: Partial<ParsedPartiallySignedSwap> = {},
): ParsedPartiallySignedSwap => ({
    outputs: [
        {
            tokenId: TOKEN_A,
            atoms: 10_000n,
            script: slushScriptHex,
        },
        {
            tokenId: TOKEN_A,
            atoms: 200n,
            script: feeScriptHex,
        },
        {
            tokenId: TOKEN_B,
            atoms: 4_997n,
            script: buyerScriptHex,
        },
    ],
    fromTokenId: TOKEN_A,
    toTokenId: TOKEN_B,
    feeInFromAtoms: 200n,
    platformFeeInFromAtoms: 0n,
    atomsFrom: 10_200n,
    atomsTo: 4_997n,
    effectiveRate: 0.4997,
    ...overrides,
});

describe('assertMakerFeeAtoms', () => {
    it('requires no fee when feePct is 0', () => {
        assertMakerFeeAtoms(10_000n, 0n, 0);
        assert.throws(
            () => assertMakerFeeAtoms(10_000n, 1n, 0),
            ValidationError,
        );
    });

    it('accepts exact makerFeeAtoms (exact-out style)', () => {
        // makerFeeAtoms(10000, 0.02) = 200
        assertMakerFeeAtoms(10_000n, 200n, 0.02);
    });

    it('accepts exact-in leftover-to-fee dust when floored fee is 0', () => {
        // splitExactInTotalAtoms(100, 0.01) → price 99, fee 1
        assertMakerFeeAtoms(99n, 1n, 0.01);
    });

    it('accepts exact-in leftover when fee is makerFee+1', () => {
        // splitExactInTotalAtoms(100, 0.02) → price 98, fee 2; makerFee(98)=1
        assertMakerFeeAtoms(98n, 2n, 0.02);
    });

    it('rejects unrelated fee amounts', () => {
        assert.throws(
            () => assertMakerFeeAtoms(10_000n, 50n, 0.02),
            ValidationError,
        );
    });
});

describe('validatePartiallySignedTx', () => {
    it('accepts a valid swap within expectedToAtoms band', () => {
        validatePartiallySignedTx(baseSwap(), {
            slushScriptHex,
            feeScriptHex,
            sellerScriptHex,
            currentRate: 0.5,
            expectedToAtoms: 4_997n,
            makerFeePct: 0.02,
        });
    });

    it('accepts atomsTo at ±1% band edges', () => {
        assert.strictEqual(SETTLE_BAND_BPS, 100n);
        const expected = 10_000n;
        // Independent of production formula (100 bps → ±1%).
        const lower = 9_900n;
        const upper = 10_100n;

        validatePartiallySignedTx(
            baseSwap({
                atomsTo: lower,
                outputs: [
                    {
                        tokenId: TOKEN_A,
                        atoms: 10_000n,
                        script: slushScriptHex,
                    },
                    {
                        tokenId: TOKEN_A,
                        atoms: 200n,
                        script: feeScriptHex,
                    },
                    {
                        tokenId: TOKEN_B,
                        atoms: lower,
                        script: buyerScriptHex,
                    },
                ],
            }),
            {
                slushScriptHex,
                feeScriptHex,
                sellerScriptHex,
                currentRate: 1,
                expectedToAtoms: expected,
                makerFeePct: 0.02,
            },
        );

        validatePartiallySignedTx(
            baseSwap({
                atomsTo: upper,
                outputs: [
                    {
                        tokenId: TOKEN_A,
                        atoms: 10_000n,
                        script: slushScriptHex,
                    },
                    {
                        tokenId: TOKEN_A,
                        atoms: 200n,
                        script: feeScriptHex,
                    },
                    {
                        tokenId: TOKEN_B,
                        atoms: upper,
                        script: buyerScriptHex,
                    },
                ],
            }),
            {
                slushScriptHex,
                feeScriptHex,
                sellerScriptHex,
                currentRate: 1,
                expectedToAtoms: expected,
                makerFeePct: 0.02,
            },
        );
    });

    it('ceils the +1% band bound for small expectedToAtoms', () => {
        // expected=3 → lower=floor(2.97)=2, upper=ceil(3.03)=4
        const expected = 3n;
        validatePartiallySignedTx(
            baseSwap({
                atomsTo: 4n,
                feeInFromAtoms: 0n,
                atomsFrom: 10_000n,
                outputs: [
                    {
                        tokenId: TOKEN_A,
                        atoms: 10_000n,
                        script: slushScriptHex,
                    },
                    {
                        tokenId: TOKEN_B,
                        atoms: 4n,
                        script: buyerScriptHex,
                    },
                ],
            }),
            {
                slushScriptHex,
                feeScriptHex,
                sellerScriptHex,
                currentRate: 1,
                expectedToAtoms: expected,
                makerFeePct: 0,
            },
        );
        assert.throws(
            () =>
                validatePartiallySignedTx(
                    baseSwap({
                        atomsTo: 5n,
                        feeInFromAtoms: 0n,
                        atomsFrom: 10_000n,
                        outputs: [
                            {
                                tokenId: TOKEN_A,
                                atoms: 10_000n,
                                script: slushScriptHex,
                            },
                            {
                                tokenId: TOKEN_B,
                                atoms: 5n,
                                script: buyerScriptHex,
                            },
                        ],
                    }),
                    {
                        slushScriptHex,
                        feeScriptHex,
                        sellerScriptHex,
                        currentRate: 1,
                        expectedToAtoms: expected,
                        makerFeePct: 0,
                    },
                ),
            /outside/,
        );
    });

    it('rejects atomsTo outside the ±1% settle band', () => {
        assert.throws(
            () =>
                validatePartiallySignedTx(baseSwap({ atomsTo: 1n }), {
                    slushScriptHex,
                    feeScriptHex,
                    sellerScriptHex,
                    currentRate: 0.5,
                    expectedToAtoms: 4_997n,
                    makerFeePct: 0.02,
                }),
            /outside/,
        );
    });

    it('rejects buyer paying a reserved script', () => {
        assert.throws(
            () =>
                validatePartiallySignedTx(
                    baseSwap({
                        outputs: [
                            {
                                tokenId: TOKEN_A,
                                atoms: 10_000n,
                                script: slushScriptHex,
                            },
                            {
                                tokenId: TOKEN_A,
                                atoms: 200n,
                                script: feeScriptHex,
                            },
                            {
                                tokenId: TOKEN_B,
                                atoms: 4_997n,
                                script: slushScriptHex,
                            },
                        ],
                    }),
                    {
                        slushScriptHex,
                        feeScriptHex,
                        sellerScriptHex,
                        currentRate: 0.5,
                        expectedToAtoms: 4_997n,
                        makerFeePct: 0.02,
                    },
                ),
            /must not pay/,
        );
    });

    it('rejects unexpected platform fee when disabled', () => {
        assert.throws(
            () =>
                validatePartiallySignedTx(
                    baseSwap({
                        platformFeeInFromAtoms: 10n,
                        atomsFrom: 10_210n,
                        outputs: [
                            {
                                tokenId: TOKEN_A,
                                atoms: 10_000n,
                                script: slushScriptHex,
                            },
                            {
                                tokenId: TOKEN_A,
                                atoms: 200n,
                                script: feeScriptHex,
                            },
                            {
                                tokenId: TOKEN_A,
                                atoms: 10n,
                                script: '76a914' + '55'.repeat(20) + '88ac',
                            },
                            {
                                tokenId: TOKEN_B,
                                atoms: 4_997n,
                                script: buyerScriptHex,
                            },
                        ],
                    }),
                    {
                        slushScriptHex,
                        feeScriptHex,
                        sellerScriptHex,
                        currentRate: 0.5,
                        expectedToAtoms: 4_997n,
                        makerFeePct: 0.02,
                        platformFeePct: 0,
                    },
                ),
            /Unexpected platform fee/,
        );
    });

    it('rejects maker fee when feePct is 0', () => {
        assert.throws(
            () =>
                validatePartiallySignedTx(baseSwap(), {
                    slushScriptHex,
                    feeScriptHex,
                    sellerScriptHex,
                    currentRate: 0.5,
                    expectedToAtoms: 4_997n,
                    makerFeePct: 0,
                }),
            /Unexpected maker fee|feePct is 0/,
        );
    });

    it('accepts zero-fee swap schema', () => {
        validatePartiallySignedTx(
            baseSwap({
                feeInFromAtoms: 0n,
                atomsFrom: 10_000n,
                outputs: [
                    {
                        tokenId: TOKEN_A,
                        atoms: 10_000n,
                        script: slushScriptHex,
                    },
                    {
                        tokenId: TOKEN_B,
                        atoms: 4_997n,
                        script: buyerScriptHex,
                    },
                ],
            }),
            {
                slushScriptHex,
                feeScriptHex,
                sellerScriptHex,
                currentRate: 0.5,
                expectedToAtoms: 4_997n,
                makerFeePct: 0,
            },
        );
    });

    it('accepts optional toToken change to slush', () => {
        validatePartiallySignedTx(
            baseSwap({
                outputs: [
                    {
                        tokenId: TOKEN_A,
                        atoms: 10_000n,
                        script: slushScriptHex,
                    },
                    {
                        tokenId: TOKEN_A,
                        atoms: 200n,
                        script: feeScriptHex,
                    },
                    {
                        tokenId: TOKEN_B,
                        atoms: 4_997n,
                        script: buyerScriptHex,
                    },
                    {
                        tokenId: TOKEN_B,
                        atoms: 195_003n,
                        script: slushScriptHex,
                    },
                ],
            }),
            {
                slushScriptHex,
                feeScriptHex,
                sellerScriptHex,
                currentRate: 0.5,
                expectedToAtoms: 4_997n,
                makerFeePct: 0.02,
            },
        );
    });
});

describe('parsePartiallySignedSwap', () => {
    const dustScript = () => Script.p2pkh(fromHex('11'.repeat(20)));

    const twoTokenTx = (opts: {
        aAtoms: bigint[];
        bAtoms: bigint[];
        midSats: bigint[];
        opReturnSats?: bigint;
    }): Tx => {
        const opReturn = emppScript([
            alpSend(TOKEN_A, ALP_TOKEN_TYPE_STANDARD.number, opts.aAtoms),
            alpSend(TOKEN_B, ALP_TOKEN_TYPE_STANDARD.number, opts.bAtoms),
        ]);
        const outputs: Tx['outputs'] = [
            { sats: opts.opReturnSats ?? 0n, script: opReturn },
        ];
        for (const sats of opts.midSats) {
            outputs.push({ sats, script: dustScript() });
        }
        return new Tx({ inputs: [], outputs });
    };

    it('rejects overlapping ALP amounts for the same output', () => {
        // Two sections both color outIdx 1 (array index 0).
        const opReturn = emppScript([
            alpSend(TOKEN_A, ALP_TOKEN_TYPE_STANDARD.number, [10_000n, 0n]),
            alpSend(TOKEN_B, ALP_TOKEN_TYPE_STANDARD.number, [5_000n, 0n]),
        ]);
        const dust = dustScript();
        const tx = new Tx({
            inputs: [],
            outputs: [
                { sats: 0n, script: opReturn },
                { sats: DEFAULT_DUST_SATS, script: dust },
                { sats: DEFAULT_DUST_SATS, script: dust },
            ],
        });
        assert.throws(
            () => parsePartiallySignedSwap(tx),
            /overlapping ALP amounts for output 1/,
        );
    });

    it('rejects non-SEND ALP sections', () => {
        const opReturn = emppScript([
            alpSend(TOKEN_A, ALP_TOKEN_TYPE_STANDARD.number, [
                10_000n,
                200n,
                0n,
            ]),
            alpSend(TOKEN_B, ALP_TOKEN_TYPE_STANDARD.number, [0n, 0n, 4_997n]),
            alpBurn(TOKEN_A, ALP_TOKEN_TYPE_STANDARD.number, 1n),
        ]);
        const dust = dustScript();
        const tx = new Tx({
            inputs: [],
            outputs: [
                { sats: 0n, script: opReturn },
                { sats: DEFAULT_DUST_SATS, script: dust },
                { sats: DEFAULT_DUST_SATS, script: dust },
                { sats: DEFAULT_DUST_SATS, script: dust },
            ],
        });
        assert.throws(
            () => parsePartiallySignedSwap(tx),
            /only ALP SEND sections are allowed/,
        );
    });

    it('rejects a third traded token on the swap', () => {
        const TOKEN_C = 'cc'.repeat(32);
        // from=A, to=B, then C after buyer — must not be ignored.
        const opReturn = emppScript([
            alpSend(TOKEN_A, ALP_TOKEN_TYPE_STANDARD.number, [
                10_000n,
                200n,
                0n,
                0n,
            ]),
            alpSend(TOKEN_B, ALP_TOKEN_TYPE_STANDARD.number, [
                0n,
                0n,
                4_997n,
                0n,
            ]),
            alpSend(TOKEN_C, ALP_TOKEN_TYPE_STANDARD.number, [0n, 0n, 0n, 50n]),
        ]);
        const dust = dustScript();
        const tx = new Tx({
            inputs: [],
            outputs: [
                { sats: 0n, script: opReturn },
                { sats: DEFAULT_DUST_SATS, script: dust },
                { sats: DEFAULT_DUST_SATS, script: dust },
                { sats: DEFAULT_DUST_SATS, script: dust },
                { sats: DEFAULT_DUST_SATS, script: dust },
            ],
        });
        assert.throws(() => parsePartiallySignedSwap(tx), /unexpected token/);
    });

    it('rejects ALP sendAtomsArray longer than the output list', () => {
        // 3 send amounts → outIdx 1..3, but tx only has outputs 0..2.
        const opReturn = emppScript([
            alpSend(TOKEN_A, ALP_TOKEN_TYPE_STANDARD.number, [
                100n,
                200n,
                300n,
            ]),
        ]);
        const dust = dustScript();
        const tx = new Tx({
            inputs: [],
            outputs: [
                { sats: 0n, script: opReturn },
                { sats: DEFAULT_DUST_SATS, script: dust },
                { sats: DEFAULT_DUST_SATS, script: dust },
            ],
        });
        assert.throws(() => parsePartiallySignedSwap(tx), /no matching output/);
    });

    it('rejects token outputs that are not dust', () => {
        // outs: price A, fee A, buyer B — buyer inflated to 1_000_000 sats
        const tx = twoTokenTx({
            aAtoms: [10_000n, 200n, 0n],
            bAtoms: [0n, 0n, 4_997n],
            midSats: [DEFAULT_DUST_SATS, DEFAULT_DUST_SATS, 1_000_000n],
        });
        assert.throws(
            () => parsePartiallySignedSwap(tx),
            /token output 3 must be dust/,
        );
    });

    it('rejects OP_RETURN with non-zero sats', () => {
        const tx = twoTokenTx({
            aAtoms: [10_000n, 200n, 0n],
            bAtoms: [0n, 0n, 4_997n],
            midSats: [DEFAULT_DUST_SATS, DEFAULT_DUST_SATS, DEFAULT_DUST_SATS],
            opReturnSats: 1n,
        });
        assert.throws(
            () => parsePartiallySignedSwap(tx),
            /OP_RETURN must have 0 sats/,
        );
    });

    it('rejects non-token mid-outs with sats', () => {
        // Extra pure-XEC out after buyer receive
        const tx = twoTokenTx({
            aAtoms: [10_000n, 200n, 0n],
            bAtoms: [0n, 0n, 4_997n],
            midSats: [
                DEFAULT_DUST_SATS,
                DEFAULT_DUST_SATS,
                DEFAULT_DUST_SATS,
                50_000n,
            ],
        });
        assert.throws(
            () => parsePartiallySignedSwap(tx),
            /non-token output 4 must have 0 sats/,
        );
    });
});
