// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { expect } from 'chai';
import { Ecc, Script, shaRmd160, toHex } from 'ecash-lib';
import { MockChronikClient } from 'mock-chronik-client';

import type { FusionChronik } from '../../src/client/chronik.js';
import {
    FusionClient,
    type FusionRoundArgs,
    type FusionRoundResult,
    type LoadedCoins,
} from '../../src/client/fusionClient.js';
import { createNodeFusionClient } from '../../src/node.js';
import type { WireContribution } from '../../src/protocol/components.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const ALP = {
    protocol: 'ALP' as const,
    type: 'ALP_TOKEN_TYPE_STANDARD' as const,
    number: 0,
};

function keypair() {
    const ecc = new Ecc();
    const sk = new Uint8Array(32);
    sk[31] = 0x22;
    const pubkey = ecc.derivePubkey(sk);
    return { sk, pubkey, pkh: toHex(shaRmd160(pubkey)) };
}

function contribFromCoins(coins: LoadedCoins): WireContribution {
    const atoms = coins.tokenInputs.reduce((sum, inp) => sum + inp.atoms, 0n);
    return {
        tokenInputs: coins.tokenInputs,
        fuelInputs: coins.fuelInputs,
        tokenOutputs: [
            {
                script: Script.p2pkh(shaRmd160(coins.tokenInputs[0].pubkey)),
                atoms,
            },
        ],
    };
}

function mockChronikWithToken(pkh: string, atoms: bigint): FusionChronik {
    const chronik = new MockChronikClient();
    chronik.setUtxosByScript('p2pkh', pkh, [
        {
            outpoint: { txid: 'aa'.repeat(32), outIdx: 0 },
            blockHeight: 100,
            isCoinbase: false,
            sats: 546n,
            isFinal: true,
            token: {
                tokenId: TOKEN_ID,
                tokenType: ALP,
                atoms,
                isMintBaton: false,
            },
        },
        {
            outpoint: { txid: 'bb'.repeat(32), outIdx: 1 },
            blockHeight: 100,
            isCoinbase: false,
            sats: 10_000n,
            isFinal: true,
        },
    ]);
    return chronik as unknown as FusionChronik;
}

function dummyRound(): FusionRoundResult {
    return { rawTx: new Uint8Array([1]) };
}

describe('FusionClient', () => {
    it('rejects construction without keys', () => {
        const chronik = new MockChronikClient() as unknown as FusionChronik;
        let threw: Error | undefined;
        try {
            new FusionClient({
                chronik,
                tokenId: TOKEN_ID,
                atomTier: 40n,
                keys: [],
                buildContribution: contribFromCoins,
                runRound: async () => dummyRound(),
            });
        } catch (err) {
            threw = err as Error;
        }
        expect(threw?.message).to.equal('FusionClient: no keys');
    });

    it('requires an injected runRound', () => {
        const { sk, pubkey } = keypair();
        const chronik = new MockChronikClient() as unknown as FusionChronik;
        let threw: Error | undefined;
        try {
            new FusionClient({
                chronik,
                tokenId: TOKEN_ID,
                atomTier: 40n,
                keys: [{ sk, pubkey }],
                buildContribution: contribFromCoins,
            } as unknown as ConstructorParameters<typeof FusionClient>[0]);
        } catch (err) {
            threw = err as Error;
        }
        expect(threw?.message).to.equal('FusionClient: runRound is required');
    });

    it('does not expose opts or keys on the public instance', () => {
        const { sk, pubkey } = keypair();
        const client = new FusionClient({
            chronik: new MockChronikClient() as unknown as FusionChronik,
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            buildContribution: contribFromCoins,
            runRound: async () => dummyRound(),
        });
        const exposed = client as unknown as { opts?: { keys?: unknown } };
        expect(exposed.opts).to.equal(undefined);
        expect(Object.hasOwn(client, 'opts')).to.equal(false);
        expect(JSON.stringify(client)).to.equal('{}');
    });

    it('returns idle when Chronik has no ALP inputs', async () => {
        const { sk, pubkey, pkh } = keypair();
        const chronik = new MockChronikClient();
        chronik.setUtxosByScript('p2pkh', pkh, [
            {
                outpoint: { txid: 'bb'.repeat(32), outIdx: 1 },
                blockHeight: 100,
                isCoinbase: false,
                sats: 10_000n,
                isFinal: true,
            },
        ]);
        let ran = false;
        const client = new FusionClient({
            chronik: chronik as unknown as FusionChronik,
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            buildContribution: contribFromCoins,
            runRound: async () => {
                ran = true;
                return dummyRound();
            },
        });
        expect(await client.fuseOnce()).to.deep.equal({ outcome: 'idle' });
        expect(ran).to.equal(false);
    });

    it('returns idle when buildContribution drops token inputs', async () => {
        const { sk, pubkey, pkh } = keypair();
        let ran = false;
        const client = new FusionClient({
            chronik: mockChronikWithToken(pkh, 40n),
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            buildContribution: () => ({
                tokenInputs: [],
                tokenOutputs: [],
            }),
            runRound: async () => {
                ran = true;
                return dummyRound();
            },
        });
        expect(await client.fuseOnce()).to.deep.equal({ outcome: 'idle' });
        expect(ran).to.equal(false);
    });

    it('loads Chronik coins and passes them to runRound', async () => {
        const { sk, pubkey, pkh } = keypair();
        const seen: FusionRoundArgs[] = [];
        const result: FusionRoundResult = {
            rawTx: new Uint8Array([0x01, 0x02]),
            txid: 'ab'.repeat(32),
            components: [],
        };
        const client = new FusionClient({
            chronik: mockChronikWithToken(pkh, 40n),
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            buildContribution: contribFromCoins,
            runRound: async args => {
                seen.push(args);
                return result;
            },
        });
        expect(await client.fuseOnce()).to.deep.equal({
            outcome: 'fused',
            result,
        });
        expect(seen).to.have.length(1);
        expect(seen[0].tokenId).to.equal(TOKEN_ID);
        expect(seen[0].atomTier).to.equal(40n);
        expect(seen[0].contribution.tokenInputs).to.have.length(1);
        expect(seen[0].contribution.tokenInputs[0].atoms).to.equal(40n);
        expect(seen[0].contribution.tokenOutputs[0].atoms).to.equal(40n);
    });

    it('wraps Chronik and round errors', async () => {
        const { sk, pubkey } = keypair();
        const broken = {
            script: () => ({
                utxos: async () => {
                    throw new Error('offline');
                },
            }),
            broadcastTx: async () => ({ txid: '' }),
        } as unknown as FusionChronik;
        const loadClient = new FusionClient({
            chronik: broken,
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            buildContribution: contribFromCoins,
            runRound: async () => dummyRound(),
        });
        let loadErr: Error | undefined;
        try {
            await loadClient.fuseOnce();
        } catch (err) {
            loadErr = err as Error;
        }
        expect(loadErr?.message).to.match(/Chronik load failed: offline/);

        const { pkh } = keypair();
        const roundClient = new FusionClient({
            chronik: mockChronikWithToken(pkh, 40n),
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            buildContribution: contribFromCoins,
            runRound: async () => {
                throw new Error('pool empty');
            },
        });
        let roundErr: Error | undefined;
        try {
            await roundClient.fuseOnce();
        } catch (err) {
            roundErr = err as Error;
        }
        expect(roundErr?.message).to.match(/round failed: pool empty/);
    });

    it('run() loops fuseOnce until stop() without SIGINT', async () => {
        const { sk, pubkey, pkh } = keypair();
        const outcomes: string[] = [];
        const fused: FusionRoundResult[] = [];
        const client = new FusionClient({
            chronik: mockChronikWithToken(pkh, 40n),
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            buildContribution: contribFromCoins,
            successDelayMs: 60_000,
            onIteration: o => outcomes.push(o),
            onFused: result => fused.push(result),
            runRound: async () => ({ rawTx: new Uint8Array([9]) }),
        });

        const t0 = Date.now();
        const running = client.run();
        setTimeout(() => client.stop(), 20);
        await running;
        expect(outcomes).to.deep.equal(['fused']);
        expect(fused).to.have.length(1);
        expect(fused[0].rawTx).to.deep.equal(new Uint8Array([9]));
        expect(Date.now() - t0).to.be.lessThan(5_000);
    });

    it('awaits async onFused before the next loop iteration', async () => {
        const { sk, pubkey, pkh } = keypair();
        const order: string[] = [];
        const client = new FusionClient({
            chronik: mockChronikWithToken(pkh, 40n),
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            buildContribution: contribFromCoins,
            successDelayMs: 0,
            onIteration: o => {
                order.push(o);
                client.stop();
            },
            onFused: async () => {
                order.push('notify');
                await new Promise<void>(resolve => {
                    setTimeout(resolve, 30);
                });
                order.push('notified');
            },
            runRound: async () => ({ rawTx: new Uint8Array([9]) }),
        });
        await client.run();
        expect(order).to.deep.equal(['notify', 'notified', 'fused']);
    });

    it('keeps a fused outcome when onFused rejects', async () => {
        const { sk, pubkey, pkh } = keypair();
        const outcomes: string[] = [];
        const client = new FusionClient({
            chronik: mockChronikWithToken(pkh, 40n),
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            buildContribution: contribFromCoins,
            successDelayMs: 0,
            onIteration: o => {
                outcomes.push(o);
                client.stop();
            },
            onFused: async () => {
                throw new Error('wallet notify');
            },
            runRound: async () => ({ rawTx: new Uint8Array([9]) }),
        });
        await client.run();
        expect(outcomes).to.deep.equal(['fused']);
    });

    it('createNodeFusionClient defaults to TCP and still accepts runRound', async () => {
        const { sk, pubkey, pkh } = keypair();
        const seen: FusionRoundArgs[] = [];
        const client = createNodeFusionClient({
            chronik: mockChronikWithToken(pkh, 40n),
            tokenId: TOKEN_ID,
            atomTier: 40n,
            keys: [{ sk, pubkey }],
            host: 'coord.example',
            port: 8788,
            buildContribution: contribFromCoins,
            runRound: async args => {
                seen.push(args);
                return { rawTx: new Uint8Array([3]) };
            },
        });
        const attempt = await client.fuseOnce();
        expect(attempt.outcome).to.equal('fused');
        expect(seen[0].tokenId).to.equal(TOKEN_ID);
    });
});
