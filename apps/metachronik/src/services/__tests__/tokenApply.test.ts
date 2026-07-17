// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { applyTokenUtxoEvents, applyTokenUtxoEventsBatch } from '../tokenApply';
import { TokenUtxoEvent } from '../tokenTypes';

describe('applyTokenUtxoEvents', () => {
    it('does not insert token utxos for outputs spent later in the same block', async () => {
        const txidFund = 'aa'.repeat(32);
        const txidSpend = 'bb'.repeat(32);
        const tokenId = 'cc'.repeat(32);
        const script = '76a914aaaa0000000000000000000000000000000088ac';

        const queries: Array<{ text: string; params?: unknown[] }> = [];
        const client = {
            query: async (text: string, params?: unknown[]) => {
                const entry: { text: string; params?: unknown[] } = { text };
                if (params !== undefined) {
                    entry.params = params;
                }
                queries.push(entry);
                return { rows: [] };
            },
        };

        const events: TokenUtxoEvent[] = [
            {
                type: 'create',
                txid: txidFund,
                vout: 0,
                script,
                tokenId,
                atoms: 1000n,
                isMintBaton: false,
                tokenProtocol: 'SLP',
                tokenType: 'SLP_TOKEN_TYPE_FUNGIBLE',
            },
            {
                type: 'spend',
                prevTxid: txidFund,
                prevVout: 0,
            },
            {
                type: 'create',
                txid: txidSpend,
                vout: 0,
                script,
                tokenId,
                atoms: 900n,
                isMintBaton: false,
                tokenProtocol: 'SLP',
                tokenType: 'SLP_TOKEN_TYPE_FUNGIBLE',
            },
        ];

        await applyTokenUtxoEvents(client, 100, events);

        const insert = queries.find(q =>
            q.text.includes('INSERT INTO token_utxos'),
        );
        expect(insert).to.not.equal(undefined);
        const params = insert!.params as unknown[];
        const atoms = params[4] as bigint[];
        expect(atoms).to.have.length(1);
        expect(atoms[0]).to.equal('900');
    });

    it('batch-applies create then spend across blocks without inserting the funded outpoint', async () => {
        const txidFund = 'dd'.repeat(32);
        const txidSpend = 'ee'.repeat(32);
        const tokenId = 'ff'.repeat(32);
        const script = '76a914dddd0000000000000000000000000000000088ac';

        const queries: Array<{ text: string; params?: unknown[] }> = [];
        const client = {
            query: async (text: string, params?: unknown[]) => {
                const entry: { text: string; params?: unknown[] } = { text };
                if (params !== undefined) {
                    entry.params = params;
                }
                queries.push(entry);
                return { rows: [] };
            },
        };

        await applyTokenUtxoEventsBatch(client, [
            {
                height: 100,
                events: [
                    {
                        type: 'create',
                        txid: txidFund,
                        vout: 0,
                        script,
                        tokenId,
                        atoms: 1000n,
                        isMintBaton: false,
                        tokenProtocol: 'SLP',
                        tokenType: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                ],
            },
            {
                height: 101,
                events: [
                    {
                        type: 'spend',
                        prevTxid: txidFund,
                        prevVout: 0,
                    },
                    {
                        type: 'create',
                        txid: txidSpend,
                        vout: 0,
                        script,
                        tokenId,
                        atoms: 900n,
                        isMintBaton: false,
                        tokenProtocol: 'SLP',
                        tokenType: 'SLP_TOKEN_TYPE_FUNGIBLE',
                    },
                ],
            },
        ]);

        expect(
            queries.filter(q => q.text.includes('DELETE FROM token_utxos')),
        ).to.have.length(0);

        const insert = queries.find(q =>
            q.text.includes('INSERT INTO token_utxos'),
        );
        expect(insert).to.not.equal(undefined);
        expect((insert!.params as unknown[])[4] as string[]).to.deep.equal([
            '900',
        ]);
        expect((insert!.params as unknown[])[8] as number[]).to.deep.equal([
            101,
        ]);
    });
});
