// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import {
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    fromHex,
    parseAlp,
    parseEmppScript,
    Script,
    SEND_STR,
} from 'ecash-lib';

import { OneShotClient, runOneShotRound } from '../../src/client/oneshot.js';
import { PoolMatcher } from '../../src/coordinator/pool.js';
import { OneShotRound } from '../../src/coordinator/round.js';
import type { PlayerContribution } from '../../src/coordinator/types.js';
import { estimateAlpSendFeeSats } from '../../src/tx/assemble.js';
import type {
    FusionFuelInput,
    FusionTokenInput,
    FusionTokenOutput,
} from '../../src/tx/types.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function p2pkh(byte: number): Script {
    return Script.p2pkh(fromHex(byte.toString(16).padStart(2, '0').repeat(20)));
}

function tokenIn(
    outIdx: number,
    atoms: bigint,
    scriptByte = 0xaa,
): FusionTokenInput {
    return {
        prevOut: { txid: '11'.repeat(32), outIdx },
        sats: DEFAULT_DUST_SATS,
        script: p2pkh(scriptByte),
        tokenId: TOKEN_ID,
        atoms,
    };
}

function tokenOut(atoms: bigint, scriptByte: number): FusionTokenOutput {
    return { script: p2pkh(scriptByte), atoms };
}

function fundFuel(
    tokenInputs: FusionTokenInput[],
    tokenOutputs: FusionTokenOutput[],
): FusionFuelInput[] {
    const shaped = {
        tokenId: TOKEN_ID,
        tokenInputs,
        tokenOutputs,
        fuelInputs: [
            {
                prevOut: { txid: '22'.repeat(32), outIdx: 0 },
                sats: 1n,
                script: p2pkh(0xcc),
                atoms: 0n,
            },
        ],
        feePerKb: DEFAULT_FEE_SATS_PER_KB,
    };
    const { feeSats } = estimateAlpSendFeeSats(shaped);
    const outSats = BigInt(tokenOutputs.length) * DEFAULT_DUST_SATS;
    const inSats = BigInt(tokenInputs.length) * DEFAULT_DUST_SATS;
    return [
        {
            prevOut: { txid: '22'.repeat(32), outIdx: 0 },
            sats: outSats + feeSats - inSats,
            script: p2pkh(0xcc),
            atoms: 0n,
        },
    ];
}

describe('OneShotRound + PoolMatcher', () => {
    it('pool match → contributions → unsigned EMPP SEND', () => {
        const matcher = new PoolMatcher(2);
        const clientA = new OneShotClient('alice', matcher);
        const clientB = new OneShotClient('bob', matcher);
        clientA.register(TOKEN_ID, 100n);
        clientB.register(TOKEN_ID, 100n);

        const inputsA = [tokenIn(0, 40n, 0xa1)];
        const outsA = [tokenOut(40n, 0xb1)];
        const inputsB = [tokenIn(1, 60n, 0xa2)];
        const outsB = [tokenOut(25n, 0xb2), tokenOut(35n, 0xb3)];
        const allInputs = [...inputsA, ...inputsB];
        const allOuts = [...outsA, ...outsB];
        const fuel = fundFuel(allInputs, allOuts);

        const contribs: PlayerContribution[] = [
            {
                playerId: 'alice',
                tokenInputs: inputsA,
                tokenOutputs: outsA,
                fuelInputs: fuel,
            },
            {
                playerId: 'bob',
                tokenInputs: inputsB,
                tokenOutputs: outsB,
            },
        ];

        const { assembled, ready } = runOneShotRound(
            matcher,
            { tokenId: TOKEN_ID, atomTier: 100n, shuffleSeed: 42 },
            contribs,
        );

        expect(ready.playerIds).to.have.members(['alice', 'bob']);
        expect(ready.playerIds).to.have.length(2);
        expect(assembled.inputAtoms).to.equal(100n);
        expect(assembled.outputAtoms).to.equal(100n);
        expect(assembled.tx.outputs.length).to.equal(4); // OP_RETURN + 3 token
        const pushes = parseEmppScript(assembled.tx.outputs[0].script);
        const alp = parseAlp(pushes![0]);
        expect(alp?.txType).to.equal(SEND_STR);
        if (alp?.txType !== SEND_STR) {
            throw new Error('expected SEND');
        }
        expect(alp.sendAtomsArray.reduce((a, n) => a + n, 0n)).to.equal(100n);
        // takeReady shuffles players; assert atom multiset, not order.
        expect(
            [...alp.sendAtomsArray].sort((a, b) => Number(a - b)),
        ).to.deep.equal([25n, 35n, 40n]);
    });

    it('shuffleSeed makes output order deterministic for fixed playerIds', () => {
        const round = new OneShotRound(
            { tokenId: TOKEN_ID, atomTier: 100n, shuffleSeed: 42 },
            ['alice', 'bob'],
        );
        const inputsA = [tokenIn(0, 40n, 0xa1)];
        const outsA = [tokenOut(40n, 0xb1)];
        const inputsB = [tokenIn(1, 60n, 0xa2)];
        const outsB = [tokenOut(25n, 0xb2), tokenOut(35n, 0xb3)];
        round.submitContribution({
            playerId: 'alice',
            tokenInputs: inputsA,
            tokenOutputs: outsA,
            fuelInputs: fundFuel(
                [...inputsA, ...inputsB],
                [...outsA, ...outsB],
            ),
        });
        round.submitContribution({
            playerId: 'bob',
            tokenInputs: inputsB,
            tokenOutputs: outsB,
        });
        const assembled = round.assemble();
        const pushes = parseEmppScript(assembled.tx.outputs[0].script);
        const alp = parseAlp(pushes![0]);
        if (alp?.txType !== SEND_STR) {
            throw new Error('expected SEND');
        }
        expect(alp.sendAtomsArray).to.deep.equal([35n, 40n, 25n]);
    });

    it('rejects shuffleSeed unless NODE_ENV=test', () => {
        const prev = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            expect(
                () =>
                    new OneShotRound(
                        { tokenId: TOKEN_ID, atomTier: 1n, shuffleSeed: 1 },
                        ['a', 'b'],
                    ),
            ).to.throw(/NODE_ENV=test/);
        } finally {
            process.env.NODE_ENV = prev;
        }
    });

    it('rejects missing / duplicate contributions', () => {
        const round = new OneShotRound({ tokenId: TOKEN_ID, atomTier: 1n }, [
            'a',
            'b',
        ]);
        round.submitContribution({
            playerId: 'a',
            tokenInputs: [tokenIn(0, 10n)],
            tokenOutputs: [tokenOut(10n, 0xb1)],
        });
        expect(() =>
            round.submitContribution({
                playerId: 'a',
                tokenInputs: [tokenIn(1, 10n)],
                tokenOutputs: [tokenOut(10n, 0xb2)],
            }),
        ).to.throw(/already contributed/);
        expect(() => round.assemble()).to.throw(/missing contributions/);
        expect(() =>
            round.submitContribution({
                playerId: 'z',
                tokenInputs: [tokenIn(2, 10n)],
                tokenOutputs: [tokenOut(10n, 0xb3)],
            }),
        ).to.throw(/not in this round/);
    });

    it('rejects duplicate outpoints across player contributions', () => {
        const round = new OneShotRound(
            { tokenId: TOKEN_ID, atomTier: 1n, shuffleSeed: 1 },
            ['a', 'b'],
        );
        const shared = tokenIn(0, 50n);
        round.submitContribution({
            playerId: 'a',
            tokenInputs: [shared],
            tokenOutputs: [tokenOut(50n, 0xb1)],
            fuelInputs: [
                {
                    prevOut: { txid: '22'.repeat(32), outIdx: 0 },
                    sats: 10_000n,
                    script: p2pkh(0xcc),
                    atoms: 0n,
                },
            ],
        });
        round.submitContribution({
            playerId: 'b',
            tokenInputs: [shared], // same prevOut as alice
            tokenOutputs: [tokenOut(50n, 0xb2)],
        });
        expect(() => round.assemble()).to.throw(/duplicate input/);
        expect(round.getPhase()).to.equal('failed');
    });

    it('runOneShotRound rejects duplicate or unexpected contributions', () => {
        const matcher = new PoolMatcher(2);
        matcher.register({
            playerId: 'alice',
            tokenId: TOKEN_ID,
            atomTier: 1n,
        });
        matcher.register({ playerId: 'bob', tokenId: TOKEN_ID, atomTier: 1n });
        const base = {
            tokenInputs: [tokenIn(0, 50n)],
            tokenOutputs: [tokenOut(50n, 0xb1)],
            fuelInputs: fundFuel(
                [tokenIn(0, 50n), tokenIn(1, 50n)],
                [tokenOut(50n, 0xb1), tokenOut(50n, 0xb2)],
            ),
        };
        expect(() =>
            runOneShotRound(matcher, { tokenId: TOKEN_ID, atomTier: 1n }, [
                { playerId: 'alice', ...base },
                {
                    playerId: 'alice',
                    tokenInputs: [tokenIn(1, 50n)],
                    tokenOutputs: [tokenOut(50n, 0xb2)],
                },
            ]),
        ).to.throw(/duplicate contribution/);

        const m2 = new PoolMatcher(2);
        m2.register({ playerId: 'alice', tokenId: TOKEN_ID, atomTier: 1n });
        m2.register({ playerId: 'bob', tokenId: TOKEN_ID, atomTier: 1n });
        expect(() =>
            runOneShotRound(m2, { tokenId: TOKEN_ID, atomTier: 1n }, [
                {
                    playerId: 'alice',
                    tokenInputs: [tokenIn(0, 50n)],
                    tokenOutputs: [tokenOut(50n, 0xb1)],
                    fuelInputs: fundFuel(
                        [tokenIn(0, 50n), tokenIn(1, 50n)],
                        [tokenOut(50n, 0xb1), tokenOut(50n, 0xb2)],
                    ),
                },
                {
                    playerId: 'bob',
                    tokenInputs: [tokenIn(1, 50n)],
                    tokenOutputs: [tokenOut(50n, 0xb2)],
                },
                {
                    playerId: 'eve',
                    tokenInputs: [tokenIn(2, 1n)],
                    tokenOutputs: [tokenOut(1n, 0xb3)],
                },
            ]),
        ).to.throw(/unexpected contribution/);
    });

    it('fails the round when assemble policy is violated', () => {
        const round = new OneShotRound(
            { tokenId: TOKEN_ID, atomTier: 1n, shuffleSeed: 1 },
            ['a', 'b'],
        );
        // Atom burn: 50 in, 40 out. Placeholder fuel (policy fails before fee).
        const fuel: FusionFuelInput[] = [
            {
                prevOut: { txid: '22'.repeat(32), outIdx: 0 },
                sats: 10_000n,
                script: p2pkh(0xcc),
                atoms: 0n,
            },
        ];
        round.submitContribution({
            playerId: 'a',
            tokenInputs: [tokenIn(0, 30n)],
            tokenOutputs: [tokenOut(20n, 0xb1)],
            fuelInputs: fuel,
        });
        round.submitContribution({
            playerId: 'b',
            tokenInputs: [tokenIn(1, 20n)],
            tokenOutputs: [tokenOut(20n, 0xb2)],
        });
        expect(() => round.assemble()).to.throw(/atom burn/);
        expect(round.getPhase()).to.equal('failed');
    });
});
