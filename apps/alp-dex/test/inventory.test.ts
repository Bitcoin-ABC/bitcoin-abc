// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import * as assert from 'assert';
import type { ChronikClient } from 'chronik-client';
import {
    ALP_TOKEN_TYPE_STANDARD,
    DEFAULT_DUST_SATS,
    Script,
    Tx,
} from 'ecash-lib';
import { MockChronikClient } from 'mock-chronik-client';
import { POSTAGE_SATS } from '../src/constants';
import {
    actionCleanupSellerToSlush,
    actionFundInventory,
    actionFundPostage,
    actionSweepMiscToFee,
} from '../src/inventory/actions';
import {
    classifySellerUtxos,
    FORMER_INVENTORY_MIN_UTXOS,
    formerInventoryKey,
    isExactInventory,
    isPostageStamp,
    splitMiscFromFormerInventory,
    type SellerUtxoLike,
} from '../src/inventory/classify';
import {
    formatMaintainTxLine,
    MaintainInventoryError,
    maintainHadActivity,
    maintainInventory,
} from '../src/inventory/maintain';
import {
    assertPositiveCountOrNone,
    INVENTORY_FUND_BATCH,
    INVENTORY_FUND_MAX_BATCHES_PER_TOKEN,
    inventoryFundBatchCount,
    inventoryUnitCount,
    MISC_SWEEP_BATCH,
    POSTAGE_FUND_BATCH,
    POSTAGE_STAMP_TARGET,
    postageFundBatchCount,
} from '../src/inventory/plan';
import type { TradedToken, TradedTokens } from '../src/tokens/tradedTokens';
import { createLpWallets } from '../src/wallet/accounts';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);
const TOKEN_OTHER = 'cc'.repeat(32);

const MNEMONIC =
    'shift satisfy hammer fit plunge swear athlete gentle tragic sorry blush cheap';
const FEE = 'ecash:qrwzys2q6xq98vwz0kjn6ulu5m6yljr5fyc909kalg';

const traded = (tokenId: string, utxoAtoms: bigint): TradedToken => ({
    tokenId,
    decimals: 0,
    utxoQty: Number(utxoAtoms),
    utxoAtoms,
    tokenTicker: 'T',
    tokenName: 'Token',
    tokenType: ALP_TOKEN_TYPE_STANDARD,
});

const tokens = (...list: TradedToken[]): TradedTokens => {
    const map: TradedTokens = new Map();
    for (const t of list) {
        map.set(t.tokenId, t);
    }
    return map;
};

const utxo = (
    outIdx: number,
    sats: bigint,
    token?: SellerUtxoLike['token'],
): SellerUtxoLike => ({
    outpoint: { txid: '11'.repeat(32), outIdx },
    sats,
    token,
});

describe('inventory classify', () => {
    const allow = tokens(traded(TOKEN_A, 100n), traded(TOKEN_B, 50n));

    it('isPostageStamp / isExactInventory basics', () => {
        assert.strictEqual(isPostageStamp(utxo(0, POSTAGE_SATS)), true);
        assert.strictEqual(isPostageStamp(utxo(0, 2000n)), false);
        assert.strictEqual(
            isExactInventory(
                utxo(0, DEFAULT_DUST_SATS, {
                    tokenId: TOKEN_A,
                    atoms: 100n,
                    isMintBaton: false,
                }),
                TOKEN_A,
                100n,
            ),
            true,
        );
        assert.strictEqual(
            isExactInventory(
                utxo(0, DEFAULT_DUST_SATS, {
                    tokenId: TOKEN_A,
                    atoms: 99n,
                    isMintBaton: false,
                }),
                TOKEN_A,
                100n,
            ),
            false,
        );
    });

    it('partitions fill-eligible, postage, wrong-sized, misc, below-dust; skips batons', () => {
        const classified = classifySellerUtxos(
            [
                utxo(0, POSTAGE_SATS),
                utxo(1, DEFAULT_DUST_SATS, {
                    tokenId: TOKEN_A,
                    atoms: 100n,
                    isMintBaton: false,
                }),
                utxo(2, DEFAULT_DUST_SATS, {
                    tokenId: TOKEN_A,
                    atoms: 40n,
                    isMintBaton: false,
                }),
                utxo(3, DEFAULT_DUST_SATS, {
                    tokenId: TOKEN_B,
                    atoms: 50n,
                    isMintBaton: false,
                }),
                utxo(4, 5_000n),
                utxo(5, DEFAULT_DUST_SATS, {
                    tokenId: TOKEN_OTHER,
                    atoms: 7n,
                    isMintBaton: false,
                }),
                utxo(6, DEFAULT_DUST_SATS, {
                    tokenId: TOKEN_A,
                    atoms: 0n,
                    isMintBaton: true,
                }),
                utxo(7, DEFAULT_DUST_SATS - 1n),
            ],
            allow,
        );

        assert.strictEqual(classified.postage.length, 1);
        assert.strictEqual(classified.fillEligible.length, 2);
        assert.strictEqual(classified.wrongSizedTraded.length, 1);
        assert.strictEqual(classified.wrongSizedTraded[0].outpoint.outIdx, 2);
        assert.strictEqual(classified.misc.length, 2);
        assert.strictEqual(classified.belowDust.length, 1);
        assert.strictEqual(classified.belowDust[0].outpoint.outIdx, 7);
        assert.strictEqual(classified.skippedBatons.length, 1);
    });

    it('never treats batons as fill-eligible or misc', () => {
        const classified = classifySellerUtxos(
            [
                utxo(0, DEFAULT_DUST_SATS, {
                    tokenId: TOKEN_A,
                    atoms: 100n,
                    isMintBaton: true,
                }),
            ],
            allow,
        );
        assert.deepStrictEqual(classified.fillEligible, []);
        assert.deepStrictEqual(classified.misc, []);
        assert.deepStrictEqual(classified.belowDust, []);
        assert.deepStrictEqual(classified.wrongSizedTraded, []);
        assert.strictEqual(classified.skippedBatons.length, 1);
    });

    it('splitMiscFromFormerInventory holds back same-size leftover piles', () => {
        const leftover = Array.from(
            { length: FORMER_INVENTORY_MIN_UTXOS },
            (_, i) =>
                utxo(i, DEFAULT_DUST_SATS, {
                    tokenId: TOKEN_OTHER,
                    atoms: 100n,
                    isMintBaton: false,
                }),
        );
        const singleton = utxo(50, DEFAULT_DUST_SATS, {
            tokenId: TOKEN_OTHER,
            atoms: 7n,
            isMintBaton: false,
        });
        const oddXec = utxo(51, 5_000n);
        const split = splitMiscFromFormerInventory([
            ...leftover,
            singleton,
            oddXec,
        ]);
        assert.strictEqual(split.formerInventory.length, 1);
        assert.strictEqual(split.formerInventory[0].tokenId, TOKEN_OTHER);
        assert.strictEqual(split.formerInventory[0].atoms, 100n);
        assert.strictEqual(
            split.formerInventory[0].utxoCount,
            FORMER_INVENTORY_MIN_UTXOS,
        );
        assert.strictEqual(split.toSweep.length, 2);
        assert.strictEqual(
            splitMiscFromFormerInventory(leftover.slice(0, 9)).formerInventory
                .length,
            0,
        );
        assert.throws(
            () => splitMiscFromFormerInventory([], 0),
            /positive safe integer/,
        );
    });

    it('sorts former-inventory piles by count, tokenId, then atoms', () => {
        const pile = (
            tokenId: string,
            atoms: bigint,
            count: number,
            start: number,
        ): SellerUtxoLike[] =>
            Array.from({ length: count }, (_, i) =>
                utxo(start + i, DEFAULT_DUST_SATS, {
                    tokenId,
                    atoms,
                    isMintBaton: false,
                }),
            );
        const split = splitMiscFromFormerInventory([
            ...pile(TOKEN_OTHER, 200n, FORMER_INVENTORY_MIN_UTXOS, 0),
            ...pile(TOKEN_OTHER, 100n, FORMER_INVENTORY_MIN_UTXOS, 20),
            ...pile(TOKEN_A, 50n, FORMER_INVENTORY_MIN_UTXOS + 1, 40),
        ]);
        assert.deepStrictEqual(
            split.formerInventory.map(
                p => `${p.tokenId}:${p.atoms}:${p.utxoCount}`,
            ),
            [
                `${TOKEN_A}:50:${FORMER_INVENTORY_MIN_UTXOS + 1}`,
                `${TOKEN_OTHER}:100:${FORMER_INVENTORY_MIN_UTXOS}`,
                `${TOKEN_OTHER}:200:${FORMER_INVENTORY_MIN_UTXOS}`,
            ],
        );
        assert.strictEqual(formerInventoryKey([]), '');
        assert.strictEqual(
            formerInventoryKey(split.formerInventory),
            `${TOKEN_A}:50:${FORMER_INVENTORY_MIN_UTXOS + 1}|` +
                `${TOKEN_OTHER}:100:${FORMER_INVENTORY_MIN_UTXOS}|` +
                `${TOKEN_OTHER}:200:${FORMER_INVENTORY_MIN_UTXOS}`,
        );
    });
});

describe('inventory plan', () => {
    it('inventoryUnitCount floors and rejects bad sizes', () => {
        assert.strictEqual(inventoryUnitCount(250n, 100n), 2);
        assert.strictEqual(inventoryUnitCount(99n, 100n), 0);
        assert.throws(() => inventoryUnitCount(1n, 0n), /positive/);
        assert.throws(() => inventoryUnitCount(-1n, 1n), /non-negative/);
        assert.throws(
            () =>
                inventoryUnitCount(
                    (BigInt(Number.MAX_SAFE_INTEGER) + 1n) * 2n,
                    2n,
                ),
            /overflow/,
        );
    });

    it('postageFundBatchCount funds a full batch only under target when funded', () => {
        assert.strictEqual(POSTAGE_STAMP_TARGET, 1000);
        assert.strictEqual(POSTAGE_FUND_BATCH, 1000);
        const need = BigInt(POSTAGE_FUND_BATCH) * POSTAGE_SATS + 100_000n;
        assert.strictEqual(postageFundBatchCount(0, need), POSTAGE_FUND_BATCH);
        assert.strictEqual(
            postageFundBatchCount(POSTAGE_STAMP_TARGET - 1, need),
            POSTAGE_FUND_BATCH,
        );
        assert.strictEqual(
            postageFundBatchCount(POSTAGE_STAMP_TARGET, need),
            0,
        );
        assert.strictEqual(postageFundBatchCount(0, need - 1n), 0);
        assert.throws(() => postageFundBatchCount(-1, need), /non-negative/);
    });

    it('inventoryFundBatchCount caps under ALP max to leave change room', () => {
        assert.strictEqual(INVENTORY_FUND_BATCH, 28);
        assert.strictEqual(inventoryFundBatchCount(0), 0);
        assert.strictEqual(inventoryFundBatchCount(1), 1);
        assert.strictEqual(inventoryFundBatchCount(28), 28);
        assert.strictEqual(inventoryFundBatchCount(29), 28);
        assert.strictEqual(inventoryFundBatchCount(3378), 28);
        assert.throws(
            () => inventoryFundBatchCount(-1),
            /must not be negative/,
        );
        assert.throws(() => inventoryFundBatchCount(1.5), /safe integer/);
        assert.strictEqual(MISC_SWEEP_BATCH, 400);
        assert.strictEqual(INVENTORY_FUND_MAX_BATCHES_PER_TOKEN, 8);
    });

    it('assertPositiveCountOrNone treats min as inclusive', () => {
        assert.strictEqual(
            assertPositiveCountOrNone(0, 'remainingUnits', 0),
            true,
        );
        assert.strictEqual(
            assertPositiveCountOrNone(1, 'remainingUnits', 0),
            true,
        );
        assert.strictEqual(
            assertPositiveCountOrNone(0, 'maxFundBatchesPerToken'),
            false,
        );
        assert.strictEqual(
            assertPositiveCountOrNone(1, 'maxFundBatchesPerToken'),
            true,
        );
        assert.throws(
            () => assertPositiveCountOrNone(-1, 'remainingUnits', 0),
            /must not be negative/,
        );
    });
});

describe('inventory actions', () => {
    const slushScript = Script.fromAddress(
        'ecash:qp2m77hpkfz4zpeeqpfw4k0fs203yw6h7gxj6aydch',
    );
    const sellerScript = Script.fromAddress(
        'ecash:qq86jv6h0y97q8l63ndynvk3fn9aq8fqru3exew8gl',
    );
    const feeScript = Script.fromAddress(FEE);

    it('actionCleanupSellerToSlush consolidates per token', () => {
        const wrong = [
            utxo(1, DEFAULT_DUST_SATS, {
                tokenId: TOKEN_A,
                atoms: 40n,
                isMintBaton: false,
            }),
            utxo(2, DEFAULT_DUST_SATS, {
                tokenId: TOKEN_A,
                atoms: 10n,
                isMintBaton: false,
            }),
            utxo(3, DEFAULT_DUST_SATS, {
                tokenId: TOKEN_B,
                atoms: 7n,
                isMintBaton: false,
            }),
        ];
        const action = actionCleanupSellerToSlush(wrong, slushScript);
        assert.ok(action);
        assert.deepStrictEqual(action.requiredUtxos, [
            wrong[0].outpoint,
            wrong[1].outpoint,
            wrong[2].outpoint,
        ]);
        assert.strictEqual(action.outputs[0].sats, 0n);
        assert.strictEqual(action.tokenActions?.length, 2);
        const tokenOuts = action.outputs.slice(1);
        const aOut = tokenOuts.find(o => o.tokenId === TOKEN_A);
        const bOut = tokenOuts.find(o => o.tokenId === TOKEN_B);
        assert.strictEqual(aOut?.atoms, 50n);
        assert.strictEqual(bOut?.atoms, 7n);
        assert.strictEqual(action.changeScript?.toHex(), slushScript.toHex());
        assert.strictEqual(actionCleanupSellerToSlush([], slushScript), null);
    });

    it('actionFundInventory is outputs-only (wallet selects inputs)', () => {
        const inv = actionFundInventory(TOKEN_A, 100n, 3, sellerScript);
        assert.ok(inv);
        assert.strictEqual(inv.outputs.length, 4); // OP_RETURN + 3
        assert.strictEqual(inv.requiredUtxos, undefined);
        assert.ok(
            inv.outputs
                .slice(1)
                .every(o => o.atoms === 100n && o.tokenId === TOKEN_A),
        );
        assert.strictEqual(
            actionFundInventory(TOKEN_A, 100n, 0, sellerScript),
            null,
        );
        assert.throws(
            () => actionFundInventory(TOKEN_A, 100n, Infinity, sellerScript),
            /safe integer/,
        );
        assert.throws(
            () => actionFundInventory(TOKEN_A, 100n, -1, sellerScript),
            /must not be negative/,
        );
    });

    it('actionFundPostage builds XEC-only outs', () => {
        const postage = actionFundPostage(2, sellerScript);
        assert.ok(postage);
        assert.strictEqual(postage.outputs.length, 2);
        assert.ok(postage.outputs.every(o => o.sats === POSTAGE_SATS));
        assert.deepStrictEqual(postage.tokenActions, []);
        assert.strictEqual(actionFundPostage(0, sellerScript), null);
        assert.throws(
            () => actionFundPostage(Infinity, sellerScript),
            /safe integer/,
        );
        assert.throws(
            () => actionFundPostage(-1, sellerScript),
            /must not be negative/,
        );
    });

    it('actionSweepMiscToFee skips batons and sends XEC + non-traded tokens', () => {
        assert.throws(
            () =>
                actionSweepMiscToFee(
                    [
                        utxo(0, DEFAULT_DUST_SATS, {
                            tokenId: TOKEN_A,
                            atoms: 1n,
                            isMintBaton: true,
                        }),
                    ],
                    feeScript,
                    slushScript,
                ),
            /batons/,
        );

        const misc = [
            utxo(0, 5_000n),
            utxo(1, DEFAULT_DUST_SATS, {
                tokenId: TOKEN_OTHER,
                atoms: 9n,
                isMintBaton: false,
            }),
        ];
        const action = actionSweepMiscToFee(misc, feeScript, slushScript);
        assert.strictEqual(action.changeScript?.toHex(), slushScript.toHex());
        assert.ok(action);
        assert.deepStrictEqual(action.requiredUtxos, [
            misc[0].outpoint,
            misc[1].outpoint,
        ]);
        const xecOut = action.outputs.find(
            o => o.tokenId === undefined && o.sats === 5_000n,
        );
        assert.ok(xecOut);
        const tokenOut = action.outputs.find(o => o.tokenId === TOKEN_OTHER);
        assert.strictEqual(tokenOut?.atoms, 9n);

        const dusty = [
            utxo(2, DEFAULT_DUST_SATS - 1n),
            utxo(3, DEFAULT_DUST_SATS, {
                tokenId: TOKEN_OTHER,
                atoms: 1n,
                isMintBaton: false,
            }),
        ];
        const dustyAction = actionSweepMiscToFee(dusty, feeScript, slushScript);
        assert.ok(dustyAction);
        assert.strictEqual(
            dustyAction.outputs.some(
                o => o.tokenId === undefined && (o.sats ?? 0n) > 0n,
            ),
            false,
        );
    });
});

describe('inventory maintain (MockChronik)', () => {
    it('MaintainInventoryError carries partial progress', () => {
        const err = new MaintainInventoryError('boom', {
            cleanedToSlush: 1,
            fundedInventory: { [TOKEN_A]: 2 },
            fundedPostage: 3,
            sweptMisc: 0,
            belowDust: 0,
            formerInventory: [],
            txids: ['aa'.repeat(32)],
        });
        assert.strictEqual(err.message, 'boom');
        assert.strictEqual(err.partial.cleanedToSlush, 1);
        assert.strictEqual(err.partial.fundedPostage, 3);
        assert.strictEqual(err.partial.txids.length, 1);
    });

    it('maintainHadActivity is false for a no-op pass', () => {
        const idle: Parameters<typeof maintainHadActivity>[0] = {
            cleanedToSlush: 0,
            fundedInventory: {},
            fundedPostage: 0,
            sweptMisc: 0,
            belowDust: 0,
            formerInventory: [],
            txids: [],
        };
        assert.strictEqual(maintainHadActivity(idle), false);
        assert.strictEqual(
            maintainHadActivity({ ...idle, txids: ['aa'.repeat(32)] }),
            true,
        );
        assert.strictEqual(
            maintainHadActivity({ ...idle, fundedInventory: { [TOKEN_A]: 1 } }),
            true,
        );
        assert.strictEqual(
            maintainHadActivity({ ...idle, fundedPostage: 1 }),
            true,
        );
    });

    it('funds postage stamps from loose slush XEC when under target', async () => {
        const mock = new MockChronikClient();
        mock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        mock.broadcastTxs = async (txsHex: string[]) => ({
            txids: txsHex.map((_, i) => i.toString(16).padStart(64, '0')),
        });

        const chronik = mock as unknown as ChronikClient;
        const { seller, slush } = createLpWallets(MNEMONIC, chronik, FEE);

        const slushSats = BigInt(POSTAGE_FUND_BATCH) * POSTAGE_SATS + 100_000n;
        mock.setUtxosByAddress(seller.address, []);
        mock.setUtxosByAddress(slush.address, [
            {
                outpoint: { txid: '22'.repeat(32), outIdx: 0 },
                blockHeight: 799_000,
                isCoinbase: false,
                sats: slushSats,
                isFinal: true,
            },
        ]);

        const logs: string[] = [];
        const origLog = console.log;
        console.log = ((...args: unknown[]) => {
            logs.push(args.map(String).join(' '));
        }) as typeof console.log;
        let result: Awaited<ReturnType<typeof maintainInventory>>;
        try {
            result = await maintainInventory({
                seller,
                slush,
                feeAddress: FEE,
                tradedTokens: new Map(),
            });
        } finally {
            console.log = origLog;
        }

        assert.strictEqual(result.fundedPostage, POSTAGE_FUND_BATCH);
        assert.strictEqual(result.cleanedToSlush, 0);
        assert.strictEqual(result.sweptMisc, 0);
        assert.deepStrictEqual(result.formerInventory, []);
        assert.ok(result.txids.length >= 1);
        for (const txid of result.txids) {
            assert.ok(
                logs.includes(formatMaintainTxLine('postage', txid)),
                `expected postage txid log for ${txid}, got ${logs.join('\n')}`,
            );
        }
    });

    it('sweeps odd seller XEC leftover to slush (not back to seller)', async () => {
        const mock = new MockChronikClient();
        mock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        const broadcastHex: string[] = [];
        mock.broadcastTxs = async (txsHex: string[]) => {
            broadcastHex.push(...txsHex);
            return {
                txids: txsHex.map((_, i) =>
                    (i + 70).toString(16).padStart(64, '0'),
                ),
            };
        };

        const chronik = mock as unknown as ChronikClient;
        const { seller, slush } = createLpWallets(MNEMONIC, chronik, FEE);

        mock.setUtxosByAddress(seller.address, [
            {
                outpoint: { txid: '33'.repeat(32), outIdx: 0 },
                blockHeight: 799_000,
                isCoinbase: false,
                sats: 640n,
                isFinal: true,
            },
            ...Array.from({ length: 3 }, (_, i) => ({
                outpoint: { txid: '22'.repeat(32), outIdx: i },
                blockHeight: 799_000,
                isCoinbase: false,
                sats: POSTAGE_SATS,
                isFinal: true,
            })),
        ]);
        mock.setUtxosByAddress(slush.address, []);

        const result = await maintainInventory({
            seller,
            slush,
            feeAddress: FEE,
            tradedTokens: new Map(),
        });

        assert.strictEqual(result.sweptMisc, 1);
        assert.ok(result.txids.length >= 1);
        assert.ok(broadcastHex.length >= 1);

        const classified = classifySellerUtxos(seller.utxos, new Map());
        assert.deepStrictEqual(classified.misc, []);
        assert.strictEqual(classified.belowDust.length, 0);
        for (const utxo of seller.utxos) {
            if (utxo.token === undefined) {
                assert.strictEqual(utxo.sats, POSTAGE_SATS);
            }
        }

        const slushHex = Script.fromAddress(slush.address).toHex();
        const sellerHex = Script.fromAddress(seller.address).toHex();
        const feeHex = Script.fromAddress(FEE).toHex();
        const sweepTx = Tx.fromHex(broadcastHex[broadcastHex.length - 1]!);
        const outScripts = sweepTx.outputs.map(out => out.script.toHex());
        assert.ok(outScripts.includes(feeHex), 'sweep sends XEC to fee');
        assert.ok(
            outScripts.includes(slushHex),
            'sweep leftover goes to slush',
        );
        assert.ok(
            !outScripts.includes(sellerHex),
            'sweep leftover must not return to seller',
        );
    });

    it('leaves same-size leftover token piles on seller (not swept to fee)', async () => {
        const mock = new MockChronikClient();
        mock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        mock.broadcastTxs = async (txsHex: string[]) => ({
            txids: txsHex.map((_, i) =>
                (i + 50).toString(16).padStart(64, '0'),
            ),
        });

        const chronik = mock as unknown as ChronikClient;
        const { seller, slush } = createLpWallets(MNEMONIC, chronik, FEE);

        const leftover = Array.from(
            { length: FORMER_INVENTORY_MIN_UTXOS },
            (_, i) => ({
                outpoint: {
                    txid: i.toString(16).padStart(64, '0'),
                    outIdx: 0,
                },
                blockHeight: 799_000,
                isCoinbase: false,
                sats: DEFAULT_DUST_SATS,
                isFinal: true,
                token: {
                    tokenId: TOKEN_OTHER,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    atoms: 100n,
                    isMintBaton: false,
                },
            }),
        );
        mock.setUtxosByAddress(seller.address, leftover);
        mock.setUtxosByAddress(slush.address, []);

        const result = await maintainInventory({
            seller,
            slush,
            feeAddress: FEE,
            tradedTokens: tokens(traded(TOKEN_A, 100n)),
        });

        assert.strictEqual(result.formerInventory.length, 1);
        assert.strictEqual(result.formerInventory[0].tokenId, TOKEN_OTHER);
        assert.strictEqual(result.formerInventory[0].atoms, 100n);
        assert.strictEqual(
            result.formerInventory[0].utxoCount,
            FORMER_INVENTORY_MIN_UTXOS,
        );
        assert.strictEqual(result.sweptMisc, 0);
        assert.strictEqual(result.txids.length, 0);
    });

    it('funds slush tokens in ALP-sized inventory batches', async () => {
        const mock = new MockChronikClient();
        mock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        mock.broadcastTxs = async (txsHex: string[]) => ({
            txids: txsHex.map((_, i) =>
                (i + 100).toString(16).padStart(64, '0'),
            ),
        });

        const chronik = mock as unknown as ChronikClient;
        const { seller, slush } = createLpWallets(MNEMONIC, chronik, FEE);

        const units = INVENTORY_FUND_BATCH + 1;
        mock.setUtxosByAddress(seller.address, []);
        mock.setUtxosByAddress(slush.address, [
            {
                outpoint: { txid: '22'.repeat(32), outIdx: 0 },
                blockHeight: 799_000,
                isCoinbase: false,
                sats: DEFAULT_DUST_SATS,
                isFinal: true,
                token: {
                    tokenId: TOKEN_A,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    atoms: 100n * BigInt(units),
                    isMintBaton: false,
                },
            },
            {
                outpoint: { txid: '33'.repeat(32), outIdx: 0 },
                blockHeight: 799_000,
                isCoinbase: false,
                sats: 500_000n,
                isFinal: true,
            },
        ]);

        const result = await maintainInventory({
            seller,
            slush,
            feeAddress: FEE,
            tradedTokens: tokens(traded(TOKEN_A, 100n)),
        });

        assert.strictEqual(result.fundedInventory[TOKEN_A], units);
        assert.ok(result.txids.length >= 2);
        assert.strictEqual(result.fundedPostage, 0);
    });

    it('defers leftover slush units after the per-token fund-batch cap', async () => {
        const mock = new MockChronikClient();
        mock.setBlockchainInfo({
            tipHash: '00'.repeat(32),
            tipHeight: 800_000,
        });
        mock.broadcastTxs = async (txsHex: string[]) => ({
            txids: txsHex.map((_, i) =>
                (i + 200).toString(16).padStart(64, '0'),
            ),
        });

        const chronik = mock as unknown as ChronikClient;
        const { seller, slush } = createLpWallets(MNEMONIC, chronik, FEE);

        const units = INVENTORY_FUND_BATCH + 1;
        mock.setUtxosByAddress(seller.address, []);
        mock.setUtxosByAddress(slush.address, [
            {
                outpoint: { txid: '22'.repeat(32), outIdx: 0 },
                blockHeight: 799_000,
                isCoinbase: false,
                sats: DEFAULT_DUST_SATS,
                isFinal: true,
                token: {
                    tokenId: TOKEN_A,
                    tokenType: ALP_TOKEN_TYPE_STANDARD,
                    atoms: 100n * BigInt(units),
                    isMintBaton: false,
                },
            },
            {
                outpoint: { txid: '33'.repeat(32), outIdx: 0 },
                blockHeight: 799_000,
                isCoinbase: false,
                sats: 500_000n,
                isFinal: true,
            },
        ]);

        const result = await maintainInventory({
            seller,
            slush,
            feeAddress: FEE,
            tradedTokens: tokens(traded(TOKEN_A, 100n)),
            maxFundBatchesPerToken: 1,
        });

        assert.strictEqual(
            result.fundedInventory[TOKEN_A],
            INVENTORY_FUND_BATCH,
        );
        assert.strictEqual(result.txids.length, 1);
    });
});
