// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { collectTokenBlockDeltas } from '../tokenBlockDeltas';

describe('collectTokenBlockDeltas', () => {
    it('sums genesis, mint, and burn atoms from tokenEntries', () => {
        const genesisTxid = 'aa'.repeat(32);
        const mintTxid = 'bb'.repeat(32);
        const tokenId = genesisTxid;

        const blockTxs = [
            {
                tokenEntries: [
                    {
                        tokenId,
                        txType: 'GENESIS',
                        isInvalid: false,
                        intentionalBurnAtoms: 0n,
                        actualBurnAtoms: 0n,
                    },
                ],
                outputs: [
                    { outputScript: '6a04deadbeef', sats: 0n },
                    {
                        outputScript:
                            '76a914aaaa0000000000000000000000000000000088ac',
                        sats: 1000n,
                        token: {
                            tokenId,
                            atoms: 5000n,
                            isMintBaton: false,
                        },
                    },
                    {
                        outputScript:
                            '76a914bbbb0000000000000000000000000000000088ac',
                        sats: 1000n,
                        token: { tokenId, isMintBaton: true },
                    },
                ],
            },
            {
                tokenEntries: [
                    {
                        tokenId,
                        txType: 'MINT',
                        isInvalid: false,
                        intentionalBurnAtoms: 0n,
                        actualBurnAtoms: 0n,
                    },
                ],
                outputs: [
                    { outputScript: '6a04mint', sats: 0n },
                    {
                        outputScript:
                            '76a914cccc0000000000000000000000000000000088ac',
                        sats: 1000n,
                        token: {
                            tokenId,
                            atoms: 20n,
                            isMintBaton: false,
                        },
                    },
                ],
            },
            {
                tokenEntries: [
                    {
                        tokenId,
                        txType: 'SEND',
                        isInvalid: false,
                        intentionalBurnAtoms: 1n,
                        actualBurnAtoms: 1n,
                    },
                ],
                inputs: [{ prevOut: { txid: mintTxid, outIdx: 0 } }],
                outputs: [
                    { outputScript: '6a04send', sats: 0n },
                    {
                        outputScript:
                            '76a914dddd0000000000000000000000000000000088ac',
                        sats: 1000n,
                        token: {
                            tokenId,
                            atoms: 18n,
                            isMintBaton: false,
                        },
                    },
                ],
            },
        ];

        const deltas = collectTokenBlockDeltas(blockTxs);
        const row = deltas.find(d => d.tokenId === tokenId);
        expect(row).to.not.equal(undefined);
        expect(row!.genesisAtoms).to.equal(5000n);
        expect(row!.mintAtoms).to.equal(20n);
        // intentionalBurnAtoms === actualBurnAtoms for intentional burns;
        // only actual is counted.
        expect(row!.burnAtoms).to.equal(1n);
    });

    it('counts accidental burns from actualBurnAtoms only', () => {
        const tokenId = 'cc'.repeat(32);
        const blockTxs = [
            {
                tokenEntries: [
                    {
                        tokenId,
                        txType: 'SEND',
                        isInvalid: false,
                        intentionalBurnAtoms: 0n,
                        actualBurnAtoms: 7n,
                    },
                ],
                outputs: [],
            },
        ];
        const deltas = collectTokenBlockDeltas(blockTxs);
        expect(deltas).to.have.length(1);
        expect(deltas[0]!.burnAtoms).to.equal(7n);
        expect(deltas[0]!.genesisAtoms).to.equal(0n);
        expect(deltas[0]!.mintAtoms).to.equal(0n);
    });

    it('skips invalid token entries', () => {
        const blockTxs = [
            {
                tokenEntries: [
                    {
                        tokenId: 'ff'.repeat(32),
                        txType: 'SEND',
                        isInvalid: true,
                        intentionalBurnAtoms: 100n,
                        actualBurnAtoms: 0n,
                    },
                ],
            },
        ];
        expect(collectTokenBlockDeltas(blockTxs)).to.have.length(0);
    });
});
