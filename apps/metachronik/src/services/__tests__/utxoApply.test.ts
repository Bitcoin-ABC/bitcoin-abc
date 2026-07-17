// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { applyUtxoEvents, applyUtxoEventsBatch } from '../utxoApply';
import { UtxoEvent } from '../utxoTypes';

describe('applyUtxoEvents', () => {
    it('does not insert utxos for outputs spent later in the same block', async () => {
        const txidFund = 'aa'.repeat(32);
        const txidSpend = 'bb'.repeat(32);
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

        const events: UtxoEvent[] = [
            {
                type: 'create',
                txid: txidFund,
                vout: 0,
                script,
                sats: 5000n,
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
                sats: 4900n,
            },
        ];

        await applyUtxoEvents(client, 100, '2009-01-03', events);

        const insert = queries.find(q => q.text.includes('INSERT INTO utxos'));
        expect(insert).to.not.equal(undefined);
        const params = insert!.params as unknown[];
        const scripts = params[2] as string[];
        expect(scripts).to.have.length(1);
        expect(scripts[0]).to.equal(script);
        expect((params[3] as bigint[])[0]).to.equal(4900n);
    });

    it('skips balance credit for known duplicate coinbase at repeat height', async () => {
        const txid =
            'e3bf3d07d4b0375638d5f1db5255fe07ba2c4cb067cd81b84ee974b6585fb468';
        const script =
            '4104124b212f5416598a92ccec88819105179dcb2550d571842601492718273fe0f2179a9695096bff94cd99dcccdea7cd9bd943bfca8fea649cac963411979a33e9ac';
        const subsidy = 5000000000n;

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

        const events = [
            {
                type: 'create' as const,
                txid,
                vout: 0,
                script,
                sats: subsidy,
            },
        ];

        await applyUtxoEvents(client, 91880, '2010-11-15', events);

        const balanceInsert = queries.find(q =>
            q.text.includes('INSERT INTO addresses'),
        );
        expect(balanceInsert).to.equal(undefined);
        const utxoInsert = queries.find(q =>
            q.text.includes('INSERT INTO utxos'),
        );
        expect(utxoInsert).to.equal(undefined);
    });

    it('inserts empty-script utxos without crediting addresses', async () => {
        const txid =
            '7bd54def72825008b4ca0f4aeff13e6be2c5fe0f23430629a9d484a1ac2a29b8';
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

        await applyUtxoEvents(client, 230926, '2013-01-01', [
            {
                type: 'create',
                txid,
                vout: 0,
                script: '',
                sats: 4096n,
            },
        ]);

        const utxoInsert = queries.find(q =>
            q.text.includes('INSERT INTO utxos'),
        );
        expect(utxoInsert).to.not.equal(undefined);
        const params = utxoInsert!.params as unknown[];
        expect((params[2] as string[])[0]).to.equal('');
        expect((params[3] as bigint[])[0]).to.equal(4096n);
        const balanceInsert = queries.find(q =>
            q.text.includes('INSERT INTO addresses'),
        );
        expect(balanceInsert).to.equal(undefined);
    });

    it('batch-applies create in one block spent in the next without inserting the funded outpoint', async () => {
        const txidFund = '11'.repeat(32);
        const txidSpend = '22'.repeat(32);
        const script = '76a914bbbb0000000000000000000000000000000088ac';

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

        await applyUtxoEventsBatch(client, [
            {
                height: 100,
                date: '2009-01-03',
                events: [
                    {
                        type: 'create',
                        txid: txidFund,
                        vout: 0,
                        script,
                        sats: 5000n,
                    },
                ],
            },
            {
                height: 101,
                date: '2009-01-03',
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
                        sats: 4900n,
                    },
                ],
            },
        ]);

        expect(
            queries.filter(q => q.text.includes('DELETE FROM utxos')),
        ).to.have.length(0);

        const insert = queries.find(q => q.text.includes('INSERT INTO utxos'));
        expect(insert).to.not.equal(undefined);
        const params = insert!.params as unknown[];
        expect(params[2] as string[]).to.deep.equal([script]);
        expect(params[3] as bigint[]).to.deep.equal([4900n]);
        expect(params[4] as number[]).to.deep.equal([101]);

        const balanceInsert = queries.find(q =>
            q.text.includes('INSERT INTO addresses'),
        );
        expect(balanceInsert).to.not.equal(undefined);
        const balanceParams = balanceInsert!.params as unknown[];
        expect(balanceParams[2] as bigint[]).to.deep.equal([4900n]);
    });

    it('uses DELETE RETURNING for tip spends and issues one flush for the batch', async () => {
        const prevTxid = '33'.repeat(32);
        const txidCreate = '44'.repeat(32);
        const script = '76a914cccc0000000000000000000000000000000088ac';

        const queries: Array<{ text: string; params?: unknown[] }> = [];
        const client = {
            query: async (text: string, params?: unknown[]) => {
                const entry: { text: string; params?: unknown[] } = { text };
                if (params !== undefined) {
                    entry.params = params;
                }
                queries.push(entry);
                if (text.includes('DELETE FROM utxos')) {
                    return {
                        rows: [
                            {
                                txid_hex: prevTxid,
                                vout: 0,
                                output_script: script,
                                sats: '10000',
                            },
                        ],
                    };
                }
                return { rows: [] };
            },
        };

        await applyUtxoEventsBatch(client, [
            {
                height: 200,
                date: '2009-01-04',
                events: [
                    {
                        type: 'spend',
                        prevTxid,
                        prevVout: 0,
                    },
                    {
                        type: 'create',
                        txid: txidCreate,
                        vout: 0,
                        script,
                        sats: 9000n,
                    },
                ],
            },
        ]);

        const deletes = queries.filter(q =>
            q.text.includes('DELETE FROM utxos'),
        );
        expect(deletes).to.have.length(1);
        expect(deletes[0]!.text).to.include('RETURNING');
        expect(
            queries.filter(
                q =>
                    q.text.includes('SELECT') &&
                    q.text.includes('FROM utxos') &&
                    !q.text.includes('DELETE'),
            ),
        ).to.have.length(0);

        const balanceInsert = queries.find(q =>
            q.text.includes('INSERT INTO addresses'),
        );
        expect(balanceInsert).to.not.equal(undefined);
        expect(
            (balanceInsert!.params as unknown[])[2] as bigint[],
        ).to.deep.equal([-1000n]);
    });

    it('resolves same-block CTOR spend-before-create without DB lookup', async () => {
        const parentTxid = 'bb'.repeat(32);
        const childTxid = 'aa'.repeat(32);
        const script = '76a914ffff0000000000000000000000000000000088ac';

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

        await applyUtxoEvents(client, 556767, '2018-11-15', [
            {
                type: 'create',
                txid: parentTxid,
                vout: 0,
                script,
                sats: 1000n,
            },
            {
                type: 'create',
                txid: childTxid,
                vout: 0,
                script,
                sats: 900n,
            },
            {
                type: 'spend',
                prevTxid: parentTxid,
                prevVout: 0,
            },
        ]);

        expect(
            queries.filter(q => q.text.includes('DELETE FROM utxos')),
        ).to.have.length(0);
        const insert = queries.find(q => q.text.includes('INSERT INTO utxos'));
        expect(insert).to.not.equal(undefined);
        expect((insert!.params as unknown[])[3] as bigint[]).to.deep.equal([
            900n,
        ]);
    });
});
