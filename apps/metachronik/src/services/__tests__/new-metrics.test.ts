// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { emppScript, fromHex } from 'ecash-lib';
import ChronikService from '../chronik';

describe('New Chart Metrics', () => {
    let chronikService: ChronikService;
    beforeEach(() => {
        chronikService = new ChronikService({
            urls: ['http://localhost:8080'],
            connectionStrategy: 'closestFirst',
        });
    });

    describe('countUniqueSenders', () => {
        it('counts unique input outputScripts across transactions', () => {
            const blockTxs = [
                { isCoinbase: true, inputs: [{ outputScript: 'coinbase' }] },
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914aaaa88ac' }],
                },
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914bbbb88ac' }],
                },
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914aaaa88ac' }],
                },
            ];
            const result = (chronikService as any).countUniqueSenders(blockTxs);
            expect(result).to.equal(2);
        });

        it('skips coinbase transactions', () => {
            const blockTxs = [
                {
                    isCoinbase: true,
                    inputs: [{ outputScript: '76a914aaaa88ac' }],
                },
            ];
            const result = (chronikService as any).countUniqueSenders(blockTxs);
            expect(result).to.equal(0);
        });

        it('handles transactions with no inputs', () => {
            const blockTxs = [
                { isCoinbase: false, inputs: [] },
                { isCoinbase: false },
            ];
            const result = (chronikService as any).countUniqueSenders(blockTxs);
            expect(result).to.equal(0);
        });

        it('handles transactions with missing outputScript on input', () => {
            const blockTxs = [
                { isCoinbase: false, inputs: [{ inputScript: 'deadbeef' }] },
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914cccc88ac' }],
                },
            ];
            const result = (chronikService as any).countUniqueSenders(blockTxs);
            expect(result).to.equal(1);
        });

        it('counts each unique sender only once across many txs', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914aaaa88ac' }],
                },
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914aaaa88ac' }],
                },
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914aaaa88ac' }],
                },
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914bbbb88ac' }],
                },
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914cccc88ac' }],
                },
                {
                    isCoinbase: false,
                    inputs: [{ outputScript: '76a914cccc88ac' }],
                },
            ];
            const result = (chronikService as any).countUniqueSenders(blockTxs);
            expect(result).to.equal(3);
        });
    });

    describe('countFusionTxs', () => {
        it('identifies CashFusion txs by FUZ LOKAD prefix', () => {
            const blockTxs = [
                {
                    isCoinbase: true,
                    outputs: [{ outputScript: '6a0446555a00deadbeef' }],
                },
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a0446555a00aabbccdd' }],
                },
                {
                    isCoinbase: false,
                    outputs: [
                        { outputScript: '76a914aaaa88ac' },
                        { outputScript: '6a0446555a00eeff0011' },
                    ],
                },
            ];
            const result = (chronikService as any).countFusionTxs(blockTxs);
            expect(result).to.equal(2);
        });

        it('identifies CashFusion txs by FUZ LOKAD prefix in eMPP', () => {
            const fusionEmppHex = emppScript([
                fromHex('46555a00aabbccdd'),
            ]).toHex();
            const blockTxs = [
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: fusionEmppHex }],
                },
            ];
            const result = (chronikService as any).countFusionTxs(blockTxs);
            expect(result).to.equal(1);
        });

        it('does not count non-fusion OP_RETURN txs', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a0400746162aabbccdd' }],
                },
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '76a914aaaa88ac' }],
                },
            ];
            const result = (chronikService as any).countFusionTxs(blockTxs);
            expect(result).to.equal(0);
        });

        it('counts each fusion tx only once even with multiple OP_RETURN outputs', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    outputs: [
                        { outputScript: '6a0446555a00aabbccdd' },
                        { outputScript: '6a0446555a00eeff0011' },
                    ],
                },
            ];
            const result = (chronikService as any).countFusionTxs(blockTxs);
            expect(result).to.equal(1);
        });

        it('handles txs with no outputs or missing outputScript', () => {
            const blockTxs = [
                { isCoinbase: false, outputs: [] },
                { isCoinbase: false, outputs: [{}] },
                { isCoinbase: false },
            ];
            const result = (chronikService as any).countFusionTxs(blockTxs);
            expect(result).to.equal(0);
        });

        it('skips coinbase transactions', () => {
            const blockTxs = [
                {
                    isCoinbase: true,
                    outputs: [{ outputScript: '6a0446555a00aabbccdd' }],
                },
            ];
            const result = (chronikService as any).countFusionTxs(blockTxs);
            expect(result).to.equal(0);
        });
    });

    describe('countAgoraUniqueTraders', () => {
        it('counts unique buyer addresses from Agora BUY txs', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            // scriptOps needs >=2 ops, second-to-last != 0x00 for BUY
                            inputScript: '5151',
                            plugins: { agora: { groups: [] } },
                            outputScript: '76a914agora_contract88ac',
                        },
                        {
                            inputScript: '41deadbeef',
                            outputScript: '76a914buyer_a88ac',
                        },
                    ],
                    outputs: [{ sats: 0n }, { sats: 1000n }, { sats: 546n }],
                },
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            inputScript: '5151',
                            plugins: { agora: { groups: [] } },
                            outputScript: '76a914agora_contract288ac',
                        },
                        {
                            inputScript: '41deadbeef',
                            outputScript: '76a914buyer_b88ac',
                        },
                    ],
                    outputs: [{ sats: 0n }, { sats: 2000n }, { sats: 546n }],
                },
            ];
            const result = (chronikService as any).countAgoraUniqueTraders(
                blockTxs,
            );
            expect(result).to.equal(2);
        });

        it('deduplicates the same buyer across multiple Agora txs', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            inputScript: '5151',
                            plugins: { agora: { groups: [] } },
                            outputScript: '76a914agora_contract88ac',
                        },
                        {
                            inputScript: '41deadbeef',
                            outputScript: '76a914same_buyer88ac',
                        },
                    ],
                    outputs: [{ sats: 0n }, { sats: 1000n }, { sats: 546n }],
                },
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            inputScript: '5151',
                            plugins: { agora: { groups: [] } },
                            outputScript: '76a914agora_contract288ac',
                        },
                        {
                            inputScript: '41aabbccdd',
                            outputScript: '76a914same_buyer88ac',
                        },
                    ],
                    outputs: [{ sats: 0n }, { sats: 3000n }, { sats: 546n }],
                },
            ];
            const result = (chronikService as any).countAgoraUniqueTraders(
                blockTxs,
            );
            expect(result).to.equal(1);
        });

        it('does not count non-Agora transactions', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            inputScript: '41deadbeef',
                            outputScript: '76a914regular_sender88ac',
                        },
                    ],
                    outputs: [{ sats: 5000n }, { sats: 2000n }],
                },
            ];
            const result = (chronikService as any).countAgoraUniqueTraders(
                blockTxs,
            );
            expect(result).to.equal(0);
        });

        it('does not count Agora CANCEL transactions', () => {
            // In Agora CANCEL txs, the isCanceled flag (second-to-last pushop) is NOT OP_0
            // The parseAgoraBuyVolume will return undefined for cancels
            const blockTxs = [
                {
                    isCoinbase: false,
                    inputs: [
                        {
                            // isCanceled = OP_1 (0x51), not OP_0 (0x00) → CANCEL
                            inputScript: '5100',
                            plugins: { agora: { groups: [] } },
                            outputScript: '76a914agora_contract88ac',
                        },
                    ],
                    outputs: [{ sats: 0n }, { sats: 1000n }],
                },
            ];
            const result = (chronikService as any).countAgoraUniqueTraders(
                blockTxs,
            );
            expect(result).to.equal(0);
        });

        it('skips coinbase transactions', () => {
            const blockTxs = [
                {
                    isCoinbase: true,
                    inputs: [
                        {
                            inputScript: '00',
                            plugins: { agora: { groups: [] } },
                            outputScript: '76a914agora88ac',
                        },
                    ],
                    outputs: [{ sats: 0n }, { sats: 1000n }],
                },
            ];
            const result = (chronikService as any).countAgoraUniqueTraders(
                blockTxs,
            );
            expect(result).to.equal(0);
        });
    });

    describe('countLokadTxs', () => {
        it('counts transactions with 4-byte LOKAD prefix in OP_RETURN', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a0400746162aabbccdd' }],
                },
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a0446555a00eeff0011' }],
                },
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a042e786563aabbccdd' }],
                },
            ];
            const result = (chronikService as any).countLokadTxs(blockTxs);
            expect(result).to.equal(3);
        });

        it('counts transactions with LOKAD prefix in eMPP OP_RETURN', () => {
            const emppHex = emppScript([fromHex('00746162aabbccdd')]).toHex();
            const blockTxs = [
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: emppHex }],
                },
            ];
            const result = (chronikService as any).countLokadTxs(blockTxs);
            expect(result).to.equal(1);
        });

        it('does not count OP_RETURN outputs without 4-byte push', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a' }],
                },
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a03aabb' }],
                },
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a05aabbccddee' }],
                },
            ];
            const result = (chronikService as any).countLokadTxs(blockTxs);
            expect(result).to.equal(0);
        });

        it('does not count non-OP_RETURN outputs', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '76a914aaaa88ac' }],
                },
            ];
            const result = (chronikService as any).countLokadTxs(blockTxs);
            expect(result).to.equal(0);
        });

        it('counts each tx only once even with multiple LOKAD outputs', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    outputs: [
                        { outputScript: '6a0400746162aabbccdd' },
                        { outputScript: '6a042e786563eeff0011' },
                    ],
                },
            ];
            const result = (chronikService as any).countLokadTxs(blockTxs);
            expect(result).to.equal(1);
        });

        it('skips coinbase transactions', () => {
            const blockTxs = [
                {
                    isCoinbase: true,
                    outputs: [{ outputScript: '6a0400746162aabbccdd' }],
                },
            ];
            const result = (chronikService as any).countLokadTxs(blockTxs);
            expect(result).to.equal(0);
        });

        it('handles txs with no outputs or missing outputScript', () => {
            const blockTxs = [
                { isCoinbase: false, outputs: [] },
                { isCoinbase: false, outputs: [{}] },
                { isCoinbase: false },
            ];
            const result = (chronikService as any).countLokadTxs(blockTxs);
            expect(result).to.equal(0);
        });

        it('requires script length >= 12 hex chars (6a04 + 4 bytes)', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a04aabb' }],
                },
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a04aabbcc' }],
                },
                {
                    isCoinbase: false,
                    outputs: [{ outputScript: '6a04aabbccdd' }],
                },
            ];
            const result = (chronikService as any).countLokadTxs(blockTxs);
            expect(result).to.equal(1);
        });
    });

    describe('collectUtxoEvents', () => {
        it('emits create events for outputs and spend events for prevOut inputs', () => {
            const coinbaseTxid = 'aa'.repeat(32);
            const spendTxid = 'bb'.repeat(32);
            const blockTxs = [
                {
                    isCoinbase: true,
                    txid: coinbaseTxid,
                    outputs: [
                        {
                            outputScript:
                                '76a914aaaa0000000000000000000000000000000088ac',
                            sats: 5000n,
                        },
                    ],
                },
                {
                    isCoinbase: false,
                    txid: spendTxid,
                    inputs: [
                        {
                            prevOut: {
                                txid: coinbaseTxid,
                                outIdx: 0,
                            },
                        },
                    ],
                    outputs: [
                        {
                            outputScript:
                                '76a914bbbb0000000000000000000000000000000088ac',
                            sats: 3000n,
                        },
                        {
                            outputScript:
                                '76a914aaaa0000000000000000000000000000000088ac',
                            sats: 1900n,
                        },
                    ],
                },
            ];

            const result = (chronikService as any).collectUtxoEvents(blockTxs);
            const creates = result.filter(
                (e: { type: string }) => e.type === 'create',
            );
            const spends = result.filter(
                (e: { type: string }) => e.type === 'spend',
            );

            expect(creates).to.have.length(3);
            expect(spends).to.have.length(1);
            expect(spends[0]).to.deep.include({
                type: 'spend',
                prevTxid: coinbaseTxid,
                prevVout: 0,
            });
            expect(
                creates.some(
                    (e: { script: string; sats: bigint }) =>
                        e.script ===
                            '76a914bbbb0000000000000000000000000000000088ac' &&
                        e.sats === 3000n,
                ),
            ).to.equal(true);
        });

        it('skips OP_RETURN outputs', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    txid: 'cc'.repeat(32),
                    outputs: [
                        { outputScript: '6a04deadbeef', sats: 1000n },
                        {
                            outputScript:
                                '76a914cccc0000000000000000000000000000000088ac',
                            sats: 2000n,
                        },
                    ],
                },
            ];

            const result = (chronikService as any).collectUtxoEvents(blockTxs);
            const creates = result.filter(
                (e: { type: string }) => e.type === 'create',
            );
            expect(creates).to.have.length(1);
            expect(creates[0].script).to.equal(
                '76a914cccc0000000000000000000000000000000088ac',
            );
            expect(creates[0].sats).to.equal(2000n);
        });

        it('tracks empty-script outputs in utxos but not as address balances', () => {
            const fundTxid = 'dd'.repeat(32);
            const spendTxid = 'ee'.repeat(32);
            const blockTxs = [
                {
                    isCoinbase: false,
                    txid: fundTxid,
                    outputs: [
                        { outputScript: '', sats: 4096n },
                        {
                            outputScript:
                                '76a914dddd0000000000000000000000000000000088ac',
                            sats: 1000n,
                        },
                    ],
                },
                {
                    isCoinbase: false,
                    txid: spendTxid,
                    inputs: [{ prevOut: { txid: fundTxid, outIdx: 0 } }],
                    outputs: [
                        {
                            outputScript:
                                '76a914eeee0000000000000000000000000000000088ac',
                            sats: 4000n,
                        },
                    ],
                },
            ];

            const result = (chronikService as any).collectUtxoEvents(blockTxs);
            const creates = result.filter(
                (e: { type: string }) => e.type === 'create',
            );
            const spends = result.filter(
                (e: { type: string }) => e.type === 'spend',
            );

            expect(creates).to.have.length(3);
            expect(creates[0]).to.deep.include({
                txid: fundTxid,
                vout: 0,
                script: '',
                sats: 4096n,
            });
            expect(spends).to.have.length(1);
            expect(spends[0]).to.deep.include({
                prevTxid: fundTxid,
                prevVout: 0,
            });
        });

        it('emits creates before spends so CTOR child-before-parent still resolves', () => {
            // Parent txid sorts after child — as on eCash CTOR-ordered blocks.
            const parentTxid = 'bb'.repeat(32);
            const childTxid = 'aa'.repeat(32);
            const script = '76a914ffff0000000000000000000000000000000088ac';
            const blockTxs = [
                {
                    isCoinbase: false,
                    txid: childTxid,
                    inputs: [{ prevOut: { txid: parentTxid, outIdx: 0 } }],
                    outputs: [
                        {
                            outputScript: script,
                            sats: 900n,
                        },
                    ],
                },
                {
                    isCoinbase: false,
                    txid: parentTxid,
                    inputs: [],
                    outputs: [
                        {
                            outputScript: script,
                            sats: 1000n,
                        },
                    ],
                },
            ];

            const result = (chronikService as any).collectUtxoEvents(blockTxs);
            const types = result.map((e: { type: string }) => e.type);
            const lastCreate = types.lastIndexOf('create');
            const firstSpend = types.indexOf('spend');
            expect(lastCreate).to.be.at.least(0);
            expect(firstSpend).to.be.at.least(0);
            expect(lastCreate).to.be.below(firstSpend);
        });
    });

    describe('collectTokenUtxoEvents', () => {
        it('emits token create and spend events for colored inputs/outputs', () => {
            const fundTxid = 'dd'.repeat(32);
            const sendTxid = 'ee'.repeat(32);
            const tokenId = 'ff'.repeat(32);
            const script = '76a914dddd0000000000000000000000000000000088ac';

            const blockTxs = [
                {
                    isCoinbase: false,
                    txid: fundTxid,
                    outputs: [
                        {
                            outputScript: script,
                            sats: 800n,
                            token: {
                                tokenId,
                                atoms: 5000n,
                                isMintBaton: false,
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                },
                            },
                        },
                    ],
                },
                {
                    isCoinbase: false,
                    txid: sendTxid,
                    inputs: [
                        {
                            prevOut: { txid: fundTxid, outIdx: 0 },
                            token: {
                                tokenId,
                                atoms: 5000n,
                                isMintBaton: false,
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                },
                            },
                        },
                    ],
                    outputs: [
                        {
                            outputScript: script,
                            sats: 600n,
                            token: {
                                tokenId,
                                atoms: 5000n,
                                isMintBaton: false,
                                tokenType: {
                                    protocol: 'SLP',
                                    type: 'SLP_TOKEN_TYPE_FUNGIBLE',
                                },
                            },
                        },
                    ],
                },
            ];

            const result = (chronikService as any).collectTokenUtxoEvents(
                blockTxs,
            );
            const creates = result.filter(
                (e: { type: string }) => e.type === 'create',
            );
            const spends = result.filter(
                (e: { type: string }) => e.type === 'spend',
            );

            expect(creates).to.have.length(2);
            expect(spends).to.have.length(1);
            expect(creates[0]).to.deep.include({
                tokenId,
                atoms: 5000n,
                tokenProtocol: 'SLP',
                tokenType: 'SLP_TOKEN_TYPE_FUNGIBLE',
            });
        });

        it('ignores outputs without token coloring', () => {
            const blockTxs = [
                {
                    isCoinbase: false,
                    txid: '11'.repeat(32),
                    outputs: [
                        {
                            outputScript:
                                '76a91411110000000000000000000000000000000088ac',
                            sats: 1000n,
                        },
                    ],
                },
            ];

            const result = (chronikService as any).collectTokenUtxoEvents(
                blockTxs,
            );
            expect(result).to.have.length(0);
        });
    });
});
