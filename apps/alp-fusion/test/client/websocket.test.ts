// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect } from 'chai';
import {
    DEFAULT_DUST_SATS,
    DEFAULT_FEE_SATS_PER_KB,
    Ecc,
    Script,
    shaRmd160,
    toHex,
    Tx,
} from 'ecash-lib';
import { MockChronikClient } from 'mock-chronik-client';

import type { FusionChronik } from '../../src/client/chronik.js';
import { FusionClient } from '../../src/client/fusionClient.js';
import {
    createWebSocketRunRound,
    runWebSocketRound,
    type WebSocketTlsOptions,
} from '../../src/client/websocket.js';
import { FusionCoordinator } from '../../src/coordinator/wire.js';
import type {
    WireContribution,
    WireFuelInput,
    WireTokenInput,
} from '../../src/protocol/components.js';
import { estimateAlpSendFeeSats } from '../../src/tx/assemble.js';
import type {
    FusionChain,
    FusionChainOutput,
} from '../../src/tx/matchInputs.js';
import type { FusionTokenOutput } from '../../src/tx/types.js';

const TOKEN_ID =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const ALP = {
    protocol: 'ALP' as const,
    type: 'ALP_TOKEN_TYPE_STANDARD' as const,
    number: 0,
};

const ecc = new Ecc();
const keysByTag = new Map<number, { sk: Buffer; pk: Buffer }>();

function keypair(tag: number): { sk: Buffer; pk: Buffer } {
    const hit = keysByTag.get(tag);
    if (hit) {
        return hit;
    }
    const sk = Buffer.alloc(32);
    sk.writeUInt32BE(tag + 1, 28);
    const created = { sk, pk: Buffer.from(ecc.derivePubkey(sk)) };
    keysByTag.set(tag, created);
    return created;
}

function scriptFromPub(pk: Uint8Array): Script {
    return Script.p2pkh(shaRmd160(pk));
}

function tokenIn(outIdx: number, atoms: bigint, tag: number): WireTokenInput {
    const { sk, pk: pubkey } = keypair(tag);
    return {
        prevOut: { txid: '11'.repeat(32), outIdx },
        sats: DEFAULT_DUST_SATS,
        script: scriptFromPub(pubkey),
        tokenId: TOKEN_ID,
        atoms,
        pubkey,
        sk,
    };
}

function tokenOut(atoms: bigint, tag: number): FusionTokenOutput {
    return { script: scriptFromPub(keypair(tag).pk), atoms };
}

function fundFuel(
    tokenInputs: WireTokenInput[],
    tokenOutputs: FusionTokenOutput[],
    tag: number,
    fuelOutIdx: number,
): WireFuelInput[] {
    const { sk, pk: pubkey } = keypair(tag);
    const placeholder = {
        prevOut: { txid: '22'.repeat(32), outIdx: fuelOutIdx },
        sats: 1n,
        script: scriptFromPub(pubkey),
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
            prevOut: { txid: '22'.repeat(32), outIdx: fuelOutIdx },
            sats: outSats + feeSats - inSats,
            script: scriptFromPub(pubkey),
            atoms: 0n,
            pubkey,
            sk,
        },
    ];
}

function pairPlayers(
    i: number,
    j: number,
): { a: WireContribution; b: WireContribution } {
    const inputsA = [tokenIn(i, 50n, 0xa0 + i)];
    const outsA = [tokenOut(50n, 0xb0 + i)];
    const inputsB = [tokenIn(j, 50n, 0xa0 + j)];
    const outsB = [tokenOut(50n, 0xb0 + j)];
    return {
        a: {
            tokenInputs: inputsA,
            tokenOutputs: outsA,
            fuelInputs: fundFuel(
                [...inputsA, ...inputsB],
                [...outsA, ...outsB],
                0xc0 + i,
                i,
            ),
        },
        b: {
            tokenInputs: inputsB,
            tokenOutputs: outsB,
        },
    };
}

function chainFor(contribs: WireContribution[]): FusionChain {
    const byTx = new Map<string, FusionChainOutput[]>();
    const place = (txid: string, outIdx: number, output: FusionChainOutput) => {
        const outputs = byTx.get(txid) ?? [];
        outputs[outIdx] = output;
        byTx.set(txid, outputs);
    };
    for (const contrib of contribs) {
        for (const inp of contrib.tokenInputs) {
            const txid =
                typeof inp.prevOut.txid === 'string'
                    ? inp.prevOut.txid
                    : Buffer.from(inp.prevOut.txid).toString('hex');
            place(txid, inp.prevOut.outIdx, {
                sats: inp.sats,
                token: {
                    tokenId: TOKEN_ID,
                    tokenType: { protocol: 'ALP' },
                    atoms: inp.atoms,
                    isMintBaton: false,
                },
            });
        }
        for (const inp of contrib.fuelInputs ?? []) {
            const txid =
                typeof inp.prevOut.txid === 'string'
                    ? inp.prevOut.txid
                    : Buffer.from(inp.prevOut.txid).toString('hex');
            place(txid, inp.prevOut.outIdx, { sats: inp.sats });
        }
    }
    return {
        tx: async (txid: string) => ({ outputs: byTx.get(txid) ?? [] }),
    };
}

function mockChronikWithToken(pkh: string): FusionChronik {
    const chronik = new MockChronikClient();
    chronik.setUtxosByScript('p2pkh', pkh, [
        {
            outpoint: { txid: 'aa'.repeat(32), outIdx: 0 },
            blockHeight: 100,
            isCoinbase: false,
            sats: DEFAULT_DUST_SATS,
            isFinal: true,
            token: {
                tokenId: TOKEN_ID,
                tokenType: ALP,
                atoms: 50n,
                isMintBaton: false,
            },
        },
    ]);
    return chronik as unknown as FusionChronik;
}

describe('FusionClient WebSocket runRound', function () {
    this.timeout(15_000);

    it('does not import the Node TCP helper', () => {
        const src = readFileSync(
            new URL('../../src/client/websocket.ts', import.meta.url),
            'utf8',
        );
        expect(src.includes("from '../node.js'")).to.equal(false);
        expect(src.includes('from "../node.js"')).to.equal(false);
        expect(src.includes("from 'ws'")).to.equal(false);
        expect(src.includes("from 'node:stream'")).to.equal(false);
        expect(src.includes("from 'node:net'")).to.equal(false);
    });

    it('rejects a gateway URL with a path or the wrong scheme', async () => {
        const contribution: WireContribution = {
            tokenInputs: [],
            tokenOutputs: [],
        };
        const base = {
            tokenId: TOKEN_ID,
            atomTier: 100n,
            contribution,
        };
        let pathErr: Error | undefined;
        try {
            await runWebSocketRound({
                ...base,
                url: 'ws://127.0.0.1:9/control',
            });
        } catch (err) {
            pathErr = err as Error;
        }
        expect(pathErr?.message).to.match(/must not include a path/);

        let schemeErr: Error | undefined;
        try {
            await runWebSocketRound({
                ...base,
                url: 'http://127.0.0.1:9',
            });
        } catch (err) {
            schemeErr = err as Error;
        }
        expect(schemeErr?.message).to.match(/ws:\/\/ or wss:\/\//);
    });

    it('completes a round via FusionClient on /control and /covert', async () => {
        await fusePair({ tls: undefined, secure: false });
    });

    it('completes a round over wss with the Node TLS adapter', async () => {
        const dir = mkdtempSync(join(tmpdir(), 'alp-fusion-ws-client-'));
        const keyPath = join(dir, 'key.pem');
        const certPath = join(dir, 'cert.pem');
        try {
            execFileSync(
                'openssl',
                [
                    'req',
                    '-x509',
                    '-newkey',
                    'rsa:2048',
                    '-keyout',
                    keyPath,
                    '-out',
                    certPath,
                    '-days',
                    '1',
                    '-nodes',
                    '-subj',
                    '/CN=localhost',
                ],
                { stdio: 'pipe' },
            );
            await fusePair({
                tls: { rejectUnauthorized: false },
                secure: true,
                cert: readFileSync(certPath),
                key: readFileSync(keyPath),
            });
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

async function fusePair(opts: {
    tls: WebSocketTlsOptions | undefined;
    secure: boolean;
    cert?: Buffer;
    key?: Buffer;
}): Promise<void> {
    const pair = pairPlayers(42, 43);
    const broadcasts: string[] = [];
    const coord = new FusionCoordinator({
        minPlayers: 2,
        atomTiers: [100n],
        // FusionBegin advertises this host. A TCP covert dial cannot
        // reach it; the WebSocket runner must use /covert instead.
        covertDomain: '203.0.113.1',
        recvTimeoutMs: 5_000,
        roundTimeoutMs: 8_000,
        wss: {
            port: 0,
            ...(opts.cert && opts.key
                ? { cert: opts.cert, key: opts.key }
                : {}),
        },
        chronik: {
            ...chainFor([pair.a, pair.b]),
            broadcastTx: async raw => {
                const hex =
                    typeof raw === 'string'
                        ? raw
                        : Buffer.from(raw).toString('hex');
                broadcasts.push(hex);
                return { txid: Tx.deser(Buffer.from(hex, 'hex')).txid() };
            },
        },
    });
    await coord.start('127.0.0.1');
    const port = coord.wssPort;
    expect(port).to.be.a('number');
    const scheme = opts.secure ? 'wss' : 'ws';
    const round = {
        url: `${scheme}://127.0.0.1:${port}`,
        recvTimeoutMs: 5_000,
        covertTimeoutMs: 5_000,
        covertRandSpanMs: 0,
        tls: opts.tls,
    };
    const { sk, pk: pubkey } = keypair(0xa0 + 42);
    const client = new FusionClient({
        chronik: mockChronikWithToken(toHex(shaRmd160(pubkey))),
        tokenId: TOKEN_ID,
        atomTier: 100n,
        keys: [{ sk, pubkey }],
        buildContribution: () => pair.a,
        runRound: createWebSocketRunRound(round),
    });
    try {
        const [attempt, other] = await Promise.all([
            client.fuseOnce(),
            runWebSocketRound({
                ...round,
                tokenId: TOKEN_ID,
                atomTier: 100n,
                contribution: pair.b,
            }),
        ]);
        expect(attempt.outcome).to.equal('fused');
        if (attempt.outcome !== 'fused') {
            throw new Error('expected fused');
        }
        expect(attempt.result.txid).to.equal(other.txid);
        expect(attempt.result.txid).to.equal(
            Tx.deser(Buffer.from(broadcasts[0], 'hex')).txid(),
        );
        expect(broadcasts).to.have.length(1);
    } finally {
        await coord.close();
    }
}
