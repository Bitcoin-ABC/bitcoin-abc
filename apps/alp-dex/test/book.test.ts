// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import { createServer } from 'http';
import type { AddressInfo } from 'net';
import { ALP_TOKEN_TYPE_STANDARD, DEFAULT_DUST_SATS } from 'ecash-lib';
import type { Wallet, WalletUtxo } from 'ecash-wallet';
import WS from 'ws';
import type { ParsedTradedConfig } from '../src/config/tradedConfig';
import { BOOK_WS_MAX_PAYLOAD, BOOK_WS_PATH } from '../src/constants';
import { BookHub } from '../src/ops/bookHub';
import { bookSnapshot } from '../src/ops/bookSnapshot';
import { attachBookWs } from '../src/ops/bookWs';
import type { TradedTokens } from '../src/tokens/tradedTokens';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);

const tradedConfig = (): ParsedTradedConfig => ({
    port: 3003,
    mnemonic:
        'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap',
    feeAddress: 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg',
    chronikUrls: ['https://chronik.test'],
    utxoQtyByToken: new Map([
        [TOKEN_A, 20],
        [TOKEN_B, 20],
    ]),
    pairs: [{ tokenIdA: TOKEN_A, tokenIdB: TOKEN_B, feePct: 0.003 }],
});

const tradedTokens = (): TradedTokens =>
    new Map([
        [
            TOKEN_A,
            {
                tokenId: TOKEN_A,
                decimals: 2,
                utxoQty: 20,
                utxoAtoms: 2_000n,
                tokenTicker: 'A',
                tokenName: 'Token A',
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        ],
        [
            TOKEN_B,
            {
                tokenId: TOKEN_B,
                decimals: 4,
                utxoQty: 20,
                utxoAtoms: 200_000n,
                tokenTicker: 'B',
                tokenName: 'Token B',
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        ],
    ]);

const tokenUtxo = (tokenId: string, atoms: bigint): WalletUtxo => ({
    outpoint: { txid: 'ab'.repeat(32), outIdx: 0 },
    blockHeight: 800_000,
    isCoinbase: false,
    sats: DEFAULT_DUST_SATS,
    isFinal: true,
    token: {
        tokenId,
        tokenType: ALP_TOKEN_TYPE_STANDARD,
        atoms,
        isMintBaton: false,
    },
    address: 'ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratq6',
});

const stubWallet = (utxos: WalletUtxo[]): Wallet =>
    ({
        address: 'ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratq6',
        utxos,
        updateBalance: () => undefined,
    }) as unknown as Wallet;

describe('bookSnapshot', () => {
    it('reports seller+slush atom reserves and both directed spots', () => {
        const seller = stubWallet([tokenUtxo(TOKEN_A, 10_000n)]);
        const slush = stubWallet([tokenUtxo(TOKEN_B, 50_000n)]);
        const snap = bookSnapshot(
            seller,
            slush,
            tradedConfig(),
            tradedTokens(),
            '2026-09-14T00:00:00.000Z',
        );
        assert.deepStrictEqual(snap, {
            type: 'book',
            timestamp: '2026-09-14T00:00:00.000Z',
            pairs: [
                {
                    aTokenId: TOKEN_A,
                    bTokenId: TOKEN_B,
                    feePct: 0.003,
                    reserves: {
                        [TOKEN_A]: '10000',
                        [TOKEN_B]: '50000',
                    },
                    spotAtoB: '0.05',
                    spotBtoA: '20',
                },
            ],
        });
    });

    it('uses n/a spots when a reserve is empty', () => {
        const seller = stubWallet([tokenUtxo(TOKEN_A, 10_000n)]);
        const slush = stubWallet([]);
        const snap = bookSnapshot(
            seller,
            slush,
            tradedConfig(),
            tradedTokens(),
        );
        assert.strictEqual(snap.pairs[0]!.spotAtoB, 'n/a');
        assert.strictEqual(snap.pairs[0]!.spotBtoA, 'n/a');
        assert.strictEqual(snap.pairs[0]!.reserves[TOKEN_B], '0');
    });
});

describe('BookHub', () => {
    it('sends the current book on subscribe and skips unchanged publishes', () => {
        const seller = stubWallet([tokenUtxo(TOKEN_A, 10_000n)]);
        const slush = stubWallet([tokenUtxo(TOKEN_B, 50_000n)]);
        let now = 't0';
        const hub = new BookHub(() =>
            bookSnapshot(seller, slush, tradedConfig(), tradedTokens(), now),
        );
        const received: string[] = [];
        assert.strictEqual(hub.current(), null);
        const unsub = hub.subscribe(json => received.push(json));
        assert.strictEqual(received.length, 1);
        assert.notStrictEqual(hub.current(), null);
        assert.strictEqual(JSON.parse(received[0]!).timestamp, 't0');

        now = 't1';
        hub.publish();
        assert.strictEqual(received.length, 1);

        slush.utxos.push(tokenUtxo(TOKEN_B, 1n));
        now = 't2';
        hub.publish();
        assert.strictEqual(received.length, 2);
        assert.strictEqual(JSON.parse(received[1]!).timestamp, 't2');
        assert.strictEqual(
            JSON.parse(received[1]!).pairs[0].reserves[TOKEN_B],
            '50001',
        );

        unsub();
        slush.utxos.push(tokenUtxo(TOKEN_B, 1n));
        hub.publish();
        assert.strictEqual(received.length, 2);
        assert.strictEqual(hub.listenerCount, 0);
    });
});

describe('attachBookWs', () => {
    it('pushes the book on connect and after publish', async () => {
        const seller = stubWallet([tokenUtxo(TOKEN_A, 10_000n)]);
        const slush = stubWallet([tokenUtxo(TOKEN_B, 50_000n)]);
        const hub = new BookHub(() =>
            bookSnapshot(seller, slush, tradedConfig(), tradedTokens()),
        );
        const server = createServer();
        attachBookWs(server, hub);
        await new Promise<void>((resolve, reject) => {
            server.listen(0, '127.0.0.1', () => resolve());
            server.once('error', reject);
        });
        const { port } = server.address() as AddressInfo;
        const frames: string[] = [];
        const client = new WS(`ws://127.0.0.1:${port}${BOOK_WS_PATH}`);
        try {
            await new Promise<void>((resolve, reject) => {
                client.once('error', reject);
                client.on('message', data => {
                    frames.push(String(data));
                    if (frames.length === 1) {
                        slush.utxos.push(tokenUtxo(TOKEN_B, 2n));
                        hub.publish();
                    }
                    if (frames.length === 2) {
                        resolve();
                    }
                });
            });
            assert.strictEqual(JSON.parse(frames[0]!).type, 'book');
            assert.strictEqual(
                JSON.parse(frames[1]!).pairs[0].reserves[TOKEN_B],
                '50002',
            );
        } finally {
            client.close();
            await new Promise<void>(resolve => {
                server.close(() => resolve());
            });
        }
    });

    it('terminates clients that miss a pong', async () => {
        const seller = stubWallet([tokenUtxo(TOKEN_A, 10_000n)]);
        const slush = stubWallet([tokenUtxo(TOKEN_B, 50_000n)]);
        const hub = new BookHub(() =>
            bookSnapshot(seller, slush, tradedConfig(), tradedTokens()),
        );
        const server = createServer();
        attachBookWs(server, hub, { pingMs: 40 });
        await new Promise<void>((resolve, reject) => {
            server.listen(0, '127.0.0.1', () => resolve());
            server.once('error', reject);
        });
        const { port } = server.address() as AddressInfo;
        const client = new WS(`ws://127.0.0.1:${port}${BOOK_WS_PATH}`, {
            autoPong: false,
        });
        try {
            await new Promise<void>((resolve, reject) => {
                client.once('error', reject);
                client.once('open', () => resolve());
            });
            await new Promise<void>((resolve, reject) => {
                const started = Date.now();
                const poll = setInterval(() => {
                    if (
                        client.readyState === WS.CLOSED &&
                        hub.listenerCount === 0
                    ) {
                        clearInterval(poll);
                        resolve();
                        return;
                    }
                    if (Date.now() - started > 400) {
                        clearInterval(poll);
                        reject(
                            new Error(
                                `readyState=${client.readyState} listeners=${hub.listenerCount}`,
                            ),
                        );
                    }
                }, 10);
            });
            assert.strictEqual(hub.listenerCount, 0);
        } finally {
            client.terminate();
            await new Promise<void>(resolve => {
                server.close(() => resolve());
            });
        }
    });

    it('closes clients that send oversized frames', async () => {
        const seller = stubWallet([tokenUtxo(TOKEN_A, 10_000n)]);
        const slush = stubWallet([tokenUtxo(TOKEN_B, 50_000n)]);
        const hub = new BookHub(() =>
            bookSnapshot(seller, slush, tradedConfig(), tradedTokens()),
        );
        const server = createServer();
        attachBookWs(server, hub);
        await new Promise<void>((resolve, reject) => {
            server.listen(0, '127.0.0.1', () => resolve());
            server.once('error', reject);
        });
        const { port } = server.address() as AddressInfo;
        const client = new WS(`ws://127.0.0.1:${port}${BOOK_WS_PATH}`);
        try {
            await new Promise<void>((resolve, reject) => {
                client.once('error', reject);
                client.once('open', () => resolve());
            });
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('oversized frame did not close client'));
                }, 250);
                client.once('close', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                client.send('x'.repeat(BOOK_WS_MAX_PAYLOAD + 1));
            });
            assert.strictEqual(hub.listenerCount, 0);
        } finally {
            client.terminate();
            await new Promise<void>(resolve => {
                server.close(() => resolve());
            });
        }
    });
});
