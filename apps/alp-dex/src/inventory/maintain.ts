// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Script } from 'ecash-lib';
import type { Wallet } from 'ecash-wallet';
import { sumFungibleAtoms } from '../pricing/reserves';
import type { TradedTokens } from '../tokens/tradedTokens';
import {
    actionCleanupSellerToSlush,
    actionFundInventory,
    actionFundPostage,
    actionSweepMiscToFee,
} from './actions';
import {
    classifySellerUtxos,
    splitMiscFromFormerInventory,
    type FormerInventoryPile,
} from './classify';
import {
    assertPositiveCountOrNone,
    INVENTORY_FUND_MAX_BATCHES_PER_TOKEN,
    inventoryFundBatchCount,
    inventoryUnitCount,
    MISC_SWEEP_BATCH,
    postageFundBatchCount,
} from './plan';

export type MaintainInventoryResult = {
    cleanedToSlush: number;
    fundedInventory: Record<string, number>;
    fundedPostage: number;
    sweptMisc: number;
    /** Sub-dust XEC seen on seller — not expected; burned as fee with misc. */
    belowDust: number;
    /** Same-size non-traded token piles left on seller (not swept). */
    formerInventory: FormerInventoryPile[];
    txids: string[];
};

/**
 * Thrown when a maintain step fails after some broadcasts may have succeeded.
 * `partial` records progress so callers can log landed txids.
 */
export class MaintainInventoryError extends Error {
    readonly partial: MaintainInventoryResult;

    constructor(
        message: string,
        partial: MaintainInventoryResult,
        cause?: unknown,
    ) {
        super(message, cause instanceof Error ? { cause } : undefined);
        this.name = 'MaintainInventoryError';
        this.partial = partial;
    }
}

/**
 * Delay between maintain passes after startup (and after each pass finishes).
 * Callers must await each maintain so passes cannot overlap.
 */
export const MAINTAIN_DELAY_MS = 5 * 60 * 1000;

/**
 * True when this pass broadcast or moved inventory. A sync-only pass
 * is not activity — scheduled maintain should stay silent.
 */
export const maintainHadActivity = (
    inventory: MaintainInventoryResult,
): boolean => {
    if (inventory.txids.length > 0) {
        return true;
    }
    if (inventory.cleanedToSlush > 0) {
        return true;
    }
    if (inventory.fundedPostage > 0) {
        return true;
    }
    if (inventory.sweptMisc > 0) {
        return true;
    }
    if (inventory.belowDust > 0) {
        return true;
    }
    return Object.keys(inventory.fundedInventory).length > 0;
};

/**
 * One-line journal summary after a maintain pass that had activity.
 * Includes full txids so operators can look them up on an explorer.
 */
export const formatMaintainResultLine = (
    label: string,
    inventory: MaintainInventoryResult,
): string => {
    const txids =
        inventory.txids.length === 0
            ? ''
            : ` txids=${inventory.txids.join(',')}`;
    return (
        `inventory maintain (${label}): cleanup→slush=${inventory.cleanedToSlush} ` +
        `postage=${inventory.fundedPostage} ` +
        `misc→fee=${inventory.sweptMisc} ` +
        `belowDust=${inventory.belowDust} txs=${inventory.txids.length}` +
        txids
    );
};

/**
 * Journal line for each maintain broadcast. Always include the full txid.
 */
export const formatMaintainTxLine = (step: string, txid: string): string =>
    `inventory maintain tx ${step}: ${txid}`;

const acceptBroadcastResult = (
    result: {
        success: boolean;
        broadcasted: string[];
    },
    txids: string[],
    step: string,
): void => {
    txids.push(...result.broadcasted);
    for (const txid of result.broadcasted) {
        console.log(formatMaintainTxLine(step, txid));
    }
    if (!result.success || result.broadcasted.length === 0) {
        throw new Error(
            `inventory maintain broadcast failed: ${JSON.stringify(result)}`,
        );
    }
};

/** Build + broadcast. Spender UTXOs update on `build()`. */
const broadcastAction = async (
    spender: Wallet,
    action: NonNullable<ReturnType<typeof actionFundPostage>>,
    txids: string[],
    step: string,
): Promise<void> => {
    const built = spender.action(action).build();
    const result = await built.broadcast();
    acceptBroadcastResult(result, txids, step);
};

/**
 * Maintain steps from SPEC.md (“Inventory automation”)
 * (startup + {@link MAINTAIN_DELAY_MS}; post-settle later):
 * 1. Wrong-sized traded-token seller UTXOs → slush
 * 2. Slush traded tokens → exact-size seller inventory
 * 3. Postage stamps on seller when under target
 * 4. Misc seller UTXOs (and any unexpected below-dust XEC) → fee.
 *    Same-size leftover token piles look like a former book — leave them.
 *
 * Callers must not overlap concurrent maintain passes (await the sequential
 * loop in `index.ts`).
 */
export const maintainInventory = async (opts: {
    seller: Wallet;
    slush: Wallet;
    feeAddress: string;
    tradedTokens: TradedTokens;
    /**
     * Override {@link INVENTORY_FUND_MAX_BATCHES_PER_TOKEN} (tests).
     */
    maxFundBatchesPerToken?: number;
}): Promise<MaintainInventoryResult> => {
    const { seller, slush, feeAddress, tradedTokens } = opts;
    const maxFundBatchesPerToken =
        opts.maxFundBatchesPerToken ?? INVENTORY_FUND_MAX_BATCHES_PER_TOKEN;
    if (
        !assertPositiveCountOrNone(
            maxFundBatchesPerToken,
            'maxFundBatchesPerToken',
        )
    ) {
        throw new Error(
            `maxFundBatchesPerToken must be a positive safe integer ` +
                `(got ${maxFundBatchesPerToken})`,
        );
    }
    const sellerScript = Script.fromAddress(seller.address);
    const slushScript = Script.fromAddress(slush.address);
    const feeScript = Script.fromAddress(feeAddress);

    const txids: string[] = [];
    const fundedInventory: Record<string, number> = {};
    let cleanedToSlush = 0;
    let fundedPostage = 0;
    let sweptMisc = 0;
    let belowDust = 0;
    let formerInventory: FormerInventoryPile[] = [];

    const partial = (): MaintainInventoryResult => ({
        cleanedToSlush,
        fundedInventory: { ...fundedInventory },
        fundedPostage,
        sweptMisc,
        belowDust,
        formerInventory: [...formerInventory],
        txids: [...txids],
    });

    try {
        // Refresh both wallets before classify/fund. Spenders update on
        // build(), but receivers (e.g. seller after slush→seller postage)
        // do not — without this, postage.length stays stale and step 3
        // re-funds every pass. Can shrink once WS / addReceivedTx keeps
        // UTXO sets current.
        await Promise.all([seller.sync(), slush.sync()]);

        // 1. Wrong-sized traded tokens on seller → slush
        //    (visible to step 2 on the next maintain pass after sync)
        {
            const { wrongSizedTraded } = classifySellerUtxos(
                seller.utxos,
                tradedTokens,
            );
            const action = actionCleanupSellerToSlush(
                wrongSizedTraded,
                slushScript,
            );
            if (action !== null) {
                await broadcastAction(seller, action, txids, 'cleanup→slush');
                cleanedToSlush = wrongSizedTraded.length;
            }
        }

        // 2. Slush traded tokens → exact-size seller inventory, ALP-sized
        //    batches (avoids one chained build of thousands of token outs).
        for (const token of tradedTokens.values()) {
            let remaining = inventoryUnitCount(
                sumFungibleAtoms(slush.utxos, token.tokenId),
                token.utxoAtoms,
            );
            let minted = 0;
            let batches = 0;
            while (remaining > 0 && batches < maxFundBatchesPerToken) {
                const unitCount = inventoryFundBatchCount(remaining);
                const action = actionFundInventory(
                    token.tokenId,
                    token.utxoAtoms,
                    unitCount,
                    sellerScript,
                );
                if (action === null) {
                    break;
                }
                await broadcastAction(
                    slush,
                    action,
                    txids,
                    `fund:${token.tokenTicker}`,
                );
                minted += unitCount;
                const nextRemaining = inventoryUnitCount(
                    sumFungibleAtoms(slush.utxos, token.tokenId),
                    token.utxoAtoms,
                );
                if (nextRemaining >= remaining) {
                    throw new Error(
                        `inventory fund did not reduce slush units for ` +
                            `${token.tokenTicker} (${token.tokenId}): ` +
                            `still ${nextRemaining} after minting ${unitCount}`,
                    );
                }
                remaining = nextRemaining;
                batches += 1;
            }
            if (minted > 0) {
                fundedInventory[token.tokenId] = minted;
            }
            if (minted > 0 && remaining > 0) {
                console.log(
                    `inventory maintain: deferred ${remaining} ` +
                        `${token.tokenTicker} inventory units to later pass`,
                );
            }
        }

        // 3. Postage: fixed batch when seller is under target
        {
            const { postage } = classifySellerUtxos(seller.utxos, tradedTokens);
            const spendable = slush.spendableSatsOnlyUtxos();
            let spendableSats = 0n;
            for (let i = 0; i < spendable.length; i++) {
                const utxo = spendable[i];
                if (utxo === undefined || utxo.sats === undefined) {
                    throw new Error(
                        `slush spendable UTXO[${i}] missing sats ` +
                            `(len=${spendable.length})`,
                    );
                }
                spendableSats += utxo.sats;
            }
            const stamps = postageFundBatchCount(postage.length, spendableSats);
            const action = actionFundPostage(stamps, sellerScript);
            if (action !== null) {
                await broadcastAction(slush, action, txids, 'postage');
                fundedPostage = stamps;
            }
        }

        // 4. Misc seller → fee. Same-size leftover token piles look like
        //    a pair this node used to trade — leave them, notify ops.
        //    Sweep the rest in MISC_SWEEP_BATCH chunks so a large pile
        //    cannot exceed MAX_TX_SERSIZE.
        {
            const classified = classifySellerUtxos(seller.utxos, tradedTokens);
            belowDust = classified.belowDust.length;
            if (belowDust > 0) {
                console.error(
                    `inventory maintain: unexpected below-dust seller XEC ` +
                        `utxos=${belowDust} (burning as fee with misc)`,
                );
            }
            const split = splitMiscFromFormerInventory(classified.misc);
            formerInventory = split.formerInventory;
            const toSweep = [...split.toSweep, ...classified.belowDust];
            for (let i = 0; i < toSweep.length; i += MISC_SWEEP_BATCH) {
                const batch = toSweep.slice(i, i + MISC_SWEEP_BATCH);
                const action = actionSweepMiscToFee(
                    batch,
                    feeScript,
                    slushScript,
                );
                if (action === null) {
                    continue;
                }
                await broadcastAction(seller, action, txids, 'misc→fee');
                for (const utxo of batch) {
                    if (!classified.belowDust.includes(utxo)) {
                        sweptMisc += 1;
                    }
                }
            }
        }

        return partial();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new MaintainInventoryError(message, partial(), err);
    }
};
