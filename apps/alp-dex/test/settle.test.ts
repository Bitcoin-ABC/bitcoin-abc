// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import type { ChronikClient, ScriptUtxo } from 'chronik-client';
import {
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    Script,
    fromHex,
    payment,
    toHex,
    type TxInput,
} from 'ecash-lib';
import { MockChronikClient } from 'mock-chronik-client';
import { SatsSelectionStrategy, Wallet } from 'ecash-wallet';
import request from 'supertest';
import { createApp } from '../src/app';
import type { ParsedTradedConfig } from '../src/config/tradedConfig';
import { POSTAGE_SATS } from '../src/constants';
import type { TradedTokens } from '../src/tokens/tradedTokens';
import { createLpWallets } from '../src/wallet/accounts';

const MNEMONIC =
    'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap';
const FEE = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';
const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);

/** 20 human units at 4 decimals. */
const UTXO_ATOMS = 200_000n;

const BUYER_SK =
    'd5bb0794bb968dfea12a848c882a57de8bea4090e29c32e84ad49f1f0138304f';

type AuditPayload = {
    outcome: string;
    clientIp: string;
    fromTokenId: string;
    toTokenId: string;
    taker: string;
    valid: boolean;
    broadcasted: boolean;
    txid: string | null;
    qtyFrom: number;
    qtyTo: number;
    qtyFee: number;
    postageSats: number;
    rate: number;
    serializedTxHexLength: number;
    error?: string;
};

const isAuditPayload = (value: unknown): value is AuditPayload =>
    value !== null &&
    typeof value === 'object' &&
    'outcome' in value &&
    'clientIp' in value &&
    'serializedTxHexLength' in value;

const installAuditSpies = (): {
    logs: AuditPayload[];
    restore: () => void;
} => {
    const logs: AuditPayload[] = [];
    const origInfo = console.info;
    const origError = console.error;
    const wrap = (...args: unknown[]) => {
        for (const arg of args) {
            if (isAuditPayload(arg)) {
                logs.push(arg);
            }
        }
    };
    console.info = wrap as typeof console.info;
    console.error = wrap as typeof console.error;
    return {
        logs,
        restore: () => {
            console.info = origInfo;
            console.error = origError;
        },
    };
};

const tradedConfig = (): ParsedTradedConfig => ({
    port: 3003,
    mnemonic: MNEMONIC,
    feeAddress: FEE,
    chronikUrls: ['https://chronik.test'],
    utxoQtyByToken: new Map([
        [TOKEN_A, 20],
        [TOKEN_B, 20],
    ]),
    pairs: [{ tokenIdA: TOKEN_A, tokenIdB: TOKEN_B, feePct: 0.02 }],
});

const tradedTokens = (): TradedTokens =>
    new Map([
        [
            TOKEN_A,
            {
                tokenId: TOKEN_A,
                decimals: 4,
                utxoQty: 20,
                utxoAtoms: UTXO_ATOMS,
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
                utxoAtoms: UTXO_ATOMS,
                tokenTicker: 'B',
                tokenName: 'Token B',
                tokenType: ALP_TOKEN_TYPE_STANDARD,
            },
        ],
    ]);

const tokenUtxo = (
    tokenId: string,
    atoms: bigint,
    outIdx: number,
    txPrefix: string,
    sats: bigint = DEFAULT_DUST_SATS,
): ScriptUtxo => ({
    outpoint: {
        txid: `${txPrefix}${outIdx.toString(16).padStart(62, '0')}`,
        outIdx: 0,
    },
    blockHeight: 800_000,
    isCoinbase: false,
    sats,
    isFinal: true,
    token: {
        tokenId,
        tokenType: ALP_TOKEN_TYPE_STANDARD,
        atoms,
        isMintBaton: false,
    },
});

/** Accept any broadcast hex (settled hex is not known ahead of POST). */
const stubAcceptAnyBroadcast = (
    mock: MockChronikClient,
    txid = 'ab'.repeat(32),
): void => {
    const ensure = (txHex: string): void => {
        if (!(txHex in mock.mockedResponses.broadcastTx)) {
            mock.setBroadcastTx(txHex, txid);
        }
    };
    const originalTx = mock.broadcastTx.bind(mock);
    mock.broadcastTx = async (txHex: string, skipTokenChecks?: boolean) => {
        ensure(txHex);
        return originalTx(txHex, skipTokenChecks);
    };
    const originalTxs = mock.broadcastTxs.bind(mock);
    mock.broadcastTxs = async (txsHex: string[], skipTokenChecks?: boolean) => {
        for (const txHex of txsHex) {
            ensure(txHex);
        }
        return originalTxs(txsHex, skipTokenChecks);
    };
};

describe('POST /api/v1/swap settle body validation', () => {
    let app: ReturnType<typeof createApp>;
    let audit: ReturnType<typeof installAuditSpies>;
    let opsMessages: string[];

    beforeEach(async () => {
        audit = installAuditSpies();
        opsMessages = [];
        const mock = new MockChronikClient();
        mock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        const chronik = mock as unknown as ChronikClient;
        const { seller, slush, addresses } = createLpWallets(
            MNEMONIC,
            chronik,
            FEE,
        );
        mock.setUtxosByAddress(seller.address, []);
        mock.setUtxosByAddress(slush.address, []);
        await Promise.all([seller.sync(), slush.sync()]);

        app = createApp({
            seller,
            slush,
            feeAddress: addresses.feeAddress,
            tradedConfig: tradedConfig(),
            tradedTokens: tradedTokens(),
            sendOps: async message => {
                opsMessages.push(message);
            },
        });
    });

    afterEach(() => {
        audit.restore();
    });

    it('rejects missing serializedTxHex', async () => {
        const res = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .set('X-Forwarded-For', '203.0.113.9, 10.0.0.1')
            .send({
                prePostageInputSats: '1000',
                tokenId: TOKEN_B,
                atoms: '10000',
            })
            .expect(400);
        assert.match(res.body.error, /serializedTxHex/);
        assert.strictEqual(audit.logs.length, 1);
        assert.strictEqual(audit.logs[0]!.outcome, 'invalid');
        assert.strictEqual(audit.logs[0]!.valid, false);
        assert.strictEqual(audit.logs[0]!.broadcasted, false);
        assert.strictEqual(audit.logs[0]!.serializedTxHexLength, 0);
        // trust proxy = 1: Express takes the hop before the connecting peer.
        assert.strictEqual(audit.logs[0]!.clientIp, '10.0.0.1');
        assert.strictEqual(audit.logs[0]!.taker, 'Unknown');
        assert.ok(!('serializedTxHex' in audit.logs[0]!));
        assert.strictEqual(opsMessages.length, 1);
        assert.match(opsMessages[0]!, /Swap Failed/);
    });

    it('rejects missing prePostageInputSats', async () => {
        const res = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex: '0200000000',
                tokenId: TOKEN_B,
                atoms: '10000',
            })
            .expect(400);
        assert.match(res.body.error, /prePostageInputSats/);
    });

    it('rejects missing tokenId', async () => {
        const res = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex: '0200000000',
                prePostageInputSats: '1000',
                atoms: '10000',
            })
            .expect(400);
        assert.match(res.body.error, /tokenId/);
    });

    it('rejects missing atoms', async () => {
        const res = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex: '0200000000',
                prePostageInputSats: '1000',
                tokenId: TOKEN_B,
            })
            .expect(400);
        assert.match(res.body.error, /atoms/);
    });

    it('rejects empty or non-numeric prePostageInputSats', async () => {
        const empty = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex: '0200000000',
                prePostageInputSats: '',
                tokenId: TOKEN_B,
                atoms: '10000',
            })
            .expect(400);
        assert.match(empty.body.error, /prePostageInputSats/);
        const boolish = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex: '0200000000',
                prePostageInputSats: true,
                tokenId: TOKEN_B,
                atoms: '10000',
            })
            .expect(400);
        assert.match(boolish.body.error, /prePostageInputSats/);
        const negative = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex: '0200000000',
                prePostageInputSats: '-1',
                tokenId: TOKEN_B,
                atoms: '10000',
            })
            .expect(400);
        assert.match(negative.body.error, /not be negative/);
    });

    it('rejects invalid transaction hex', async () => {
        const res = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex: 'invalid_hex_string',
                prePostageInputSats: '1000',
                tokenId: TOKEN_B,
                atoms: '10000',
            })
            .expect(400);
        assert.match(res.body.error, /deserialize/);
    });

    it('rejects tokenId that is not the receiving token', async () => {
        const res = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex: '0200000000',
                prePostageInputSats: '1000',
                tokenId: TOKEN_A,
                atoms: '10000',
            })
            .expect(400);
        assert.match(res.body.error, /expected/);
    });
});

describe('POST /api/v1/swap settle E2E (MockChronik)', () => {
    let mock: MockChronikClient;
    let seller: Wallet;
    let slush: Wallet;
    let app: ReturnType<typeof createApp>;
    let maintainCalls = 0;
    let audit: ReturnType<typeof installAuditSpies>;

    beforeEach(async () => {
        maintainCalls = 0;
        audit = installAuditSpies();
        mock = new MockChronikClient();
        mock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        stubAcceptAnyBroadcast(mock);
        const chronik = mock as unknown as ChronikClient;
        const wallets = createLpWallets(MNEMONIC, chronik, FEE);
        seller = wallets.seller;
        slush = wallets.slush;

        const aUtxos = Array.from({ length: 100 }, (_, i) =>
            tokenUtxo(TOKEN_A, UTXO_ATOMS, i, '11'),
        );
        const bUtxos = Array.from({ length: 50 }, (_, i) =>
            tokenUtxo(TOKEN_B, UTXO_ATOMS, i, '22'),
        );
        const postageUtxos: ScriptUtxo[] = Array.from(
            { length: 20 },
            (_, i) => ({
                outpoint: {
                    txid: `33${i.toString(16).padStart(62, '0')}`,
                    outIdx: 0,
                },
                blockHeight: 800_000,
                isCoinbase: false,
                sats: POSTAGE_SATS,
                isFinal: true,
            }),
        );
        mock.setUtxosByAddress(seller.address, [
            ...aUtxos,
            ...bUtxos,
            ...postageUtxos,
        ]);
        mock.setUtxosByAddress(slush.address, []);
        await Promise.all([seller.sync(), slush.sync()]);

        app = createApp({
            seller,
            slush,
            feeAddress: wallets.addresses.feeAddress,
            tradedConfig: tradedConfig(),
            tradedTokens: tradedTokens(),
            maintainInventory: async () => {
                maintainCalls += 1;
            },
        });
    });

    afterEach(() => {
        audit.restore();
    });

    it('settles a template → buyer buildPostage → fuel → broadcast', async () => {
        const template = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1.02&feePct=0.02`)
            .expect(200);

        assert.ok(Array.isArray(template.body.outputs));
        assert.ok(template.body.outputs.length >= 3);

        const receivingTokenAtoms = BigInt(
            template.body.outputs.find(
                (o: { tokenId: string }) => o.tokenId === TOKEN_B,
            )!.atoms,
        );

        const totalFromAtoms = template.body.outputs
            .filter((o: { tokenId: string }) => o.tokenId === TOKEN_A)
            .reduce(
                (sum: bigint, o: { atoms: string }) => sum + BigInt(o.atoms),
                0n,
            );

        const buyerMock = new MockChronikClient();
        buyerMock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        const buyer = Wallet.fromSk(
            fromHex(BUYER_SK),
            buyerMock as unknown as ChronikClient,
        );

        const numBuyerUtxos =
            Math.ceil(Number(totalFromAtoms) / Number(10_000n)) + 2;
        const buyerUtxos: ScriptUtxo[] = Array.from(
            { length: numBuyerUtxos },
            (_, i) => ({
                outpoint: {
                    txid: '11'.repeat(32),
                    outIdx: i,
                },
                blockHeight: 800_000,
                isCoinbase: false,
                sats: DEFAULT_DUST_SATS,
                isFinal: true,
                token: {
                    tokenId: TOKEN_A,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    atoms: 10_000n,
                    isMintBaton: false,
                },
            }),
        );
        buyerMock.setUtxosByAddress(buyer.address, buyerUtxos);
        await buyer.sync();

        const paymentOutputs: payment.PaymentOutput[] = [{ sats: 0n }];
        for (const output of template.body.outputs) {
            const paymentOutput: payment.PaymentOutput = {
                sats: DEFAULT_DUST_SATS,
                tokenId: output.tokenId,
                atoms: BigInt(output.atoms),
                isMintBaton: false,
            };
            if (output.script) {
                paymentOutput.script = new Script(fromHex(output.script));
            } else {
                paymentOutput.script = buyer.script;
            }
            paymentOutputs.push(paymentOutput);
        }

        // Exact inventory UTXOs: ceil via bigint, then optional change to slush.
        const numUtxosNeeded =
            receivingTokenAtoms === 0n
                ? 0
                : Number((receivingTokenAtoms + UTXO_ATOMS - 1n) / UTXO_ATOMS);
        const totalInputAtoms = UTXO_ATOMS * BigInt(numUtxosNeeded);
        const changeAtoms = totalInputAtoms - receivingTokenAtoms;
        if (changeAtoms > 0n && template.body.slushScript) {
            paymentOutputs.push({
                sats: DEFAULT_DUST_SATS,
                script: new Script(fromHex(template.body.slushScript)),
                tokenId: TOKEN_B,
                atoms: changeAtoms,
                isMintBaton: false,
            });
        }

        const swapAction: payment.Action = {
            outputs: paymentOutputs,
            tokenActions: [
                {
                    type: 'SEND',
                    tokenId: TOKEN_A,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
                {
                    type: 'SEND',
                    tokenId: TOKEN_B,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                },
            ],
        };

        const postageTx = buyer
            .action(swapAction, {
                satsStrategy: SatsSelectionStrategy.NO_SATS,
                ignoredTokenIds: [TOKEN_B],
            })
            .buildPostage()[0]
            .buildStepPostage(0);

        const serializedTxHex = toHex(postageTx.partiallySignedTx.ser());
        const prePostageInputSats = postageTx.partiallySignedTx.inputs
            .map((input: TxInput) => input.signData!.sats ?? 0n)
            .reduce((a: bigint, b: bigint) => a + b, 0n);

        const settle = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .set('X-Forwarded-For', '198.51.100.10')
            .send({
                serializedTxHex,
                prePostageInputSats: prePostageInputSats.toString(),
                tokenId: TOKEN_B,
                atoms: receivingTokenAtoms.toString(),
            });

        if (settle.status !== 200) {
            console.error('Settle failed:', settle.body);
        }
        assert.strictEqual(settle.status, 200);
        assert.strictEqual(settle.body.success, true);
        assert.strictEqual(typeof settle.body.txid, 'string');
        assert.strictEqual(typeof settle.body.postagePaidSats, 'string');
        // Node-added fuel only (taker + inventory outs excluded by outpoint).
        assert.strictEqual(
            BigInt(settle.body.postagePaidSats) % POSTAGE_SATS,
            0n,
        );
        assert.ok(BigInt(settle.body.postagePaidSats) > 0n);

        // Fire-and-forget maintain may still be scheduling; give it a tick.
        await new Promise(resolve => setImmediate(resolve));
        assert.strictEqual(maintainCalls, 1);
        assert.strictEqual(audit.logs.length, 1);
        assert.strictEqual(audit.logs[0]!.outcome, 'success');
        assert.strictEqual(audit.logs[0]!.valid, true);
        assert.strictEqual(audit.logs[0]!.broadcasted, true);
        assert.strictEqual(audit.logs[0]!.txid, settle.body.txid);
        assert.strictEqual(audit.logs[0]!.clientIp, '198.51.100.10');
        assert.ok(audit.logs[0]!.qtyFrom > 0);
        assert.ok(audit.logs[0]!.qtyTo > 0);
        assert.ok(audit.logs[0]!.taker.startsWith('ecash:'));
        assert.ok(audit.logs[0]!.serializedTxHexLength > 0);
        assert.ok(!('serializedTxHex' in audit.logs[0]!));
    });

    it('rejects body atoms that do not match the buyer toToken out', async () => {
        const template = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1.02&feePct=0.02`)
            .expect(200);

        const receivingTokenAtoms = BigInt(
            template.body.outputs.find(
                (o: { tokenId: string }) => o.tokenId === TOKEN_B,
            )!.atoms,
        );
        const totalFromAtoms = template.body.outputs
            .filter((o: { tokenId: string }) => o.tokenId === TOKEN_A)
            .reduce(
                (sum: bigint, o: { atoms: string }) => sum + BigInt(o.atoms),
                0n,
            );

        const buyerMock = new MockChronikClient();
        buyerMock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        const buyer = Wallet.fromSk(
            fromHex(BUYER_SK),
            buyerMock as unknown as ChronikClient,
        );
        const numBuyerUtxos =
            Math.ceil(Number(totalFromAtoms) / Number(10_000n)) + 2;
        buyerMock.setUtxosByAddress(
            buyer.address,
            Array.from({ length: numBuyerUtxos }, (_, i) => ({
                outpoint: { txid: '11'.repeat(32), outIdx: i },
                blockHeight: 800_000,
                isCoinbase: false,
                sats: DEFAULT_DUST_SATS,
                isFinal: true,
                token: {
                    tokenId: TOKEN_A,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    atoms: 10_000n,
                    isMintBaton: false,
                },
            })),
        );
        await buyer.sync();

        const paymentOutputs: payment.PaymentOutput[] = [{ sats: 0n }];
        for (const output of template.body.outputs) {
            const paymentOutput: payment.PaymentOutput = {
                sats: DEFAULT_DUST_SATS,
                tokenId: output.tokenId,
                atoms: BigInt(output.atoms),
                isMintBaton: false,
            };
            if (output.script) {
                paymentOutput.script = new Script(fromHex(output.script));
            } else {
                paymentOutput.script = buyer.script;
            }
            paymentOutputs.push(paymentOutput);
        }
        const numUtxosNeeded =
            receivingTokenAtoms === 0n
                ? 0
                : Number((receivingTokenAtoms + UTXO_ATOMS - 1n) / UTXO_ATOMS);
        const changeAtoms =
            UTXO_ATOMS * BigInt(numUtxosNeeded) - receivingTokenAtoms;
        if (changeAtoms > 0n && template.body.slushScript) {
            paymentOutputs.push({
                sats: DEFAULT_DUST_SATS,
                script: new Script(fromHex(template.body.slushScript)),
                tokenId: TOKEN_B,
                atoms: changeAtoms,
                isMintBaton: false,
            });
        }

        const postageTx = buyer
            .action(
                {
                    outputs: paymentOutputs,
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: TOKEN_A,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                        {
                            type: 'SEND',
                            tokenId: TOKEN_B,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                    ],
                },
                {
                    satsStrategy: SatsSelectionStrategy.NO_SATS,
                    ignoredTokenIds: [TOKEN_B],
                },
            )
            .buildPostage()[0]
            .buildStepPostage(0);

        const serializedTxHex = toHex(postageTx.partiallySignedTx.ser());
        const prePostageInputSats = postageTx.partiallySignedTx.inputs
            .map((input: TxInput) => input.signData!.sats ?? 0n)
            .reduce((a: bigint, b: bigint) => a + b, 0n);

        const settle = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex,
                prePostageInputSats: prePostageInputSats.toString(),
                tokenId: TOKEN_B,
                // Inflated vs buyer out — must not drive extra inventory.
                atoms: (receivingTokenAtoms + 1n).toString(),
            })
            .expect(400);
        assert.match(settle.body.error, /atoms mismatch/);
    });

    it('rejects toToken totals that are not a multiple of inventory size', async () => {
        const template = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1.02&feePct=0.02`)
            .expect(200);

        const receivingTokenAtoms = BigInt(
            template.body.outputs.find(
                (o: { tokenId: string }) => o.tokenId === TOKEN_B,
            )!.atoms,
        );
        // 4997 is not a multiple of UTXO_ATOMS — omit change on purpose.
        assert.notStrictEqual(receivingTokenAtoms % UTXO_ATOMS, 0n);

        const totalFromAtoms = template.body.outputs
            .filter((o: { tokenId: string }) => o.tokenId === TOKEN_A)
            .reduce(
                (sum: bigint, o: { atoms: string }) => sum + BigInt(o.atoms),
                0n,
            );

        const buyerMock = new MockChronikClient();
        buyerMock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        const buyer = Wallet.fromSk(
            fromHex(BUYER_SK),
            buyerMock as unknown as ChronikClient,
        );
        const numBuyerUtxos =
            Number((totalFromAtoms + 10_000n - 1n) / 10_000n) + 2;
        buyerMock.setUtxosByAddress(
            buyer.address,
            Array.from({ length: numBuyerUtxos }, (_, i) => ({
                outpoint: { txid: '11'.repeat(32), outIdx: i },
                blockHeight: 800_000,
                isCoinbase: false,
                sats: DEFAULT_DUST_SATS,
                isFinal: true,
                token: {
                    tokenId: TOKEN_A,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    atoms: 10_000n,
                    isMintBaton: false,
                },
            })),
        );
        await buyer.sync();

        const paymentOutputs: payment.PaymentOutput[] = [{ sats: 0n }];
        for (const output of template.body.outputs) {
            const paymentOutput: payment.PaymentOutput = {
                sats: DEFAULT_DUST_SATS,
                tokenId: output.tokenId,
                atoms: BigInt(output.atoms),
                isMintBaton: false,
            };
            if (output.script) {
                paymentOutput.script = new Script(fromHex(output.script));
            } else {
                paymentOutput.script = buyer.script;
            }
            paymentOutputs.push(paymentOutput);
        }

        const postageTx = buyer
            .action(
                {
                    outputs: paymentOutputs,
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: TOKEN_A,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                        {
                            type: 'SEND',
                            tokenId: TOKEN_B,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                    ],
                },
                {
                    satsStrategy: SatsSelectionStrategy.NO_SATS,
                    ignoredTokenIds: [TOKEN_B],
                },
            )
            .buildPostage()[0]
            .buildStepPostage(0);

        const serializedTxHex = toHex(postageTx.partiallySignedTx.ser());
        const prePostageInputSats = postageTx.partiallySignedTx.inputs
            .map((input: TxInput) => input.signData!.sats ?? 0n)
            .reduce((a: bigint, b: bigint) => a + b, 0n);

        const settle = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .send({
                serializedTxHex,
                prePostageInputSats: prePostageInputSats.toString(),
                tokenId: TOKEN_B,
                atoms: receivingTokenAtoms.toString(),
            })
            .expect(400);
        assert.match(settle.body.error, /multiple of/);
    });

    it('logs settle audit on 500 after validation (sync failure)', async () => {
        const template = await request(app)
            .get(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}?from=1.02&feePct=0.02`)
            .expect(200);

        const receivingTokenAtoms = BigInt(
            template.body.outputs.find(
                (o: { tokenId: string }) => o.tokenId === TOKEN_B,
            )!.atoms,
        );
        const totalFromAtoms = template.body.outputs
            .filter((o: { tokenId: string }) => o.tokenId === TOKEN_A)
            .reduce(
                (sum: bigint, o: { atoms: string }) => sum + BigInt(o.atoms),
                0n,
            );

        const buyerMock = new MockChronikClient();
        buyerMock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        const buyer = Wallet.fromSk(
            fromHex(BUYER_SK),
            buyerMock as unknown as ChronikClient,
        );
        const numBuyerUtxos =
            Number((totalFromAtoms + 10_000n - 1n) / 10_000n) + 2;
        buyerMock.setUtxosByAddress(
            buyer.address,
            Array.from({ length: numBuyerUtxos }, (_, i) => ({
                outpoint: { txid: '11'.repeat(32), outIdx: i },
                blockHeight: 800_000,
                isCoinbase: false,
                sats: DEFAULT_DUST_SATS,
                isFinal: true,
                token: {
                    tokenId: TOKEN_A,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    atoms: 10_000n,
                    isMintBaton: false,
                },
            })),
        );
        await buyer.sync();

        const paymentOutputs: payment.PaymentOutput[] = [{ sats: 0n }];
        for (const output of template.body.outputs) {
            const paymentOutput: payment.PaymentOutput = {
                sats: DEFAULT_DUST_SATS,
                tokenId: output.tokenId,
                atoms: BigInt(output.atoms),
                isMintBaton: false,
            };
            if (output.script) {
                paymentOutput.script = new Script(fromHex(output.script));
            } else {
                paymentOutput.script = buyer.script;
            }
            paymentOutputs.push(paymentOutput);
        }
        const numUtxosNeeded =
            receivingTokenAtoms === 0n
                ? 0
                : Number((receivingTokenAtoms + UTXO_ATOMS - 1n) / UTXO_ATOMS);
        const changeAtoms =
            UTXO_ATOMS * BigInt(numUtxosNeeded) - receivingTokenAtoms;
        if (changeAtoms > 0n && template.body.slushScript) {
            paymentOutputs.push({
                sats: DEFAULT_DUST_SATS,
                script: new Script(fromHex(template.body.slushScript)),
                tokenId: TOKEN_B,
                atoms: changeAtoms,
                isMintBaton: false,
            });
        }

        const postageTx = buyer
            .action(
                {
                    outputs: paymentOutputs,
                    tokenActions: [
                        {
                            type: 'SEND',
                            tokenId: TOKEN_A,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                        {
                            type: 'SEND',
                            tokenId: TOKEN_B,
                            tokenType: ALP_TOKEN_TYPE_STANDARD,
                        },
                    ],
                },
                {
                    satsStrategy: SatsSelectionStrategy.NO_SATS,
                    ignoredTokenIds: [TOKEN_B],
                },
            )
            .buildPostage()[0]
            .buildStepPostage(0);

        seller.sync = async () => {
            throw new Error('chronik sync failed');
        };

        const settle = await request(app)
            .post(`/api/v1/swap/${TOKEN_A}/${TOKEN_B}`)
            .set('X-Forwarded-For', '198.51.100.20')
            .send({
                serializedTxHex: toHex(postageTx.partiallySignedTx.ser()),
                prePostageInputSats: postageTx.partiallySignedTx.inputs
                    .map((input: TxInput) => input.signData!.sats ?? 0n)
                    .reduce((a: bigint, b: bigint) => a + b, 0n)
                    .toString(),
                tokenId: TOKEN_B,
                atoms: receivingTokenAtoms.toString(),
            })
            .expect(500);
        assert.strictEqual(
            settle.body.error,
            'Failed to complete swap transaction',
        );
        assert.strictEqual(audit.logs.length, 1);
        assert.strictEqual(audit.logs[0]!.outcome, 'failed');
        assert.strictEqual(audit.logs[0]!.valid, false);
        assert.strictEqual(audit.logs[0]!.broadcasted, false);
        assert.strictEqual(audit.logs[0]!.txid, null);
        assert.strictEqual(audit.logs[0]!.clientIp, '198.51.100.20');
        assert.ok(audit.logs[0]!.serializedTxHexLength > 0);
        assert.ok(audit.logs[0]!.taker.startsWith('ecash:'));
        assert.ok(!('serializedTxHex' in audit.logs[0]!));
    });
});
