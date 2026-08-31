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
import { classifySellerUtxos } from './classify';
import { inventoryUnitCount, postageFundBatchCount } from './plan';

export type MaintainInventoryResult = {
    cleanedToSlush: number;
    fundedInventory: Record<string, number>;
    fundedPostage: number;
    sweptMisc: number;
    /** Sub-dust XEC seen on seller — not expected; burned with misc when present. */
    belowDust: number;
    txids: string[];
};

/**
 * Thrown when a maintain step fails after some broadcasts may have succeeded.
 * `partial` records progress so callers can log landed txids.
 */
export class MaintainInventoryError extends Error {
    readonly partial: MaintainInventoryResult;

    constructor(message: string, partial: MaintainInventoryResult) {
        super(message);
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

const acceptBroadcastResult = (
    result: {
        success: boolean;
        broadcasted: string[];
    },
    txids: string[],
): void => {
    txids.push(...result.broadcasted);
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
): Promise<void> => {
    const built = spender.action(action).build();
    const result = await built.broadcast();
    acceptBroadcastResult(result, txids);
};

/**
 * Maintain steps from SPEC.md (“Inventory automation”)
 * (startup + {@link MAINTAIN_DELAY_MS}; post-settle later):
 * 1. Wrong-sized traded-token seller UTXOs → slush
 * 2. Slush traded tokens → exact-size seller inventory
 * 3. Postage stamps on seller when under target
 * 4. Misc seller UTXOs (and any unexpected below-dust XEC) → fee
 *
 * Callers must not overlap concurrent maintain passes (await the sequential
 * loop in `index.ts`).
 */
export const maintainInventory = async (opts: {
    seller: Wallet;
    slush: Wallet;
    feeAddress: string;
    tradedTokens: TradedTokens;
}): Promise<MaintainInventoryResult> => {
    const { seller, slush, feeAddress, tradedTokens } = opts;
    const sellerScript = Script.fromAddress(seller.address);
    const slushScript = Script.fromAddress(slush.address);
    const feeScript = Script.fromAddress(feeAddress);

    const txids: string[] = [];
    const fundedInventory: Record<string, number> = {};
    let cleanedToSlush = 0;
    let fundedPostage = 0;
    let sweptMisc = 0;
    let belowDust = 0;

    const partial = (): MaintainInventoryResult => ({
        cleanedToSlush,
        fundedInventory: { ...fundedInventory },
        fundedPostage,
        sweptMisc,
        belowDust,
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
                await broadcastAction(seller, action, txids);
                cleanedToSlush = wrongSizedTraded.length;
            }
        }

        // 2. Slush traded tokens → exact-size seller inventory (wallet chains)
        for (const token of tradedTokens.values()) {
            const atoms = sumFungibleAtoms(slush.utxos, token.tokenId);
            const unitCount = inventoryUnitCount(atoms, token.utxoAtoms);
            const action = actionFundInventory(
                token.tokenId,
                token.utxoAtoms,
                unitCount,
                sellerScript,
            );
            if (action === null) {
                continue;
            }
            await broadcastAction(slush, action, txids);
            fundedInventory[token.tokenId] = unitCount;
        }

        // 3. Postage: fixed batch when seller is under target
        {
            const { postage } = classifySellerUtxos(seller.utxos, tradedTokens);
            const spendableSats = slush
                .spendableSatsOnlyUtxos()
                .reduce((sum, u) => sum + u.sats, 0n);
            const stamps = postageFundBatchCount(postage.length, spendableSats);
            const action = actionFundPostage(stamps, sellerScript);
            if (action !== null) {
                await broadcastAction(slush, action, txids);
                fundedPostage = stamps;
            }
        }

        // 4. Misc seller → fee (include below-dust XEC if any; not expected)
        {
            const classified = classifySellerUtxos(seller.utxos, tradedTokens);
            belowDust = classified.belowDust.length;
            if (belowDust > 0) {
                console.error(
                    `inventory maintain: unexpected below-dust seller XEC ` +
                        `utxos=${belowDust} (burning as fee with misc)`,
                );
            }
            const toSweep = [...classified.misc, ...classified.belowDust];
            const action = actionSweepMiscToFee(toSweep, feeScript);
            if (action !== null) {
                await broadcastAction(seller, action, txids);
                sweptMisc = classified.misc.length;
            }
        }

        return partial();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new MaintainInventoryError(message, partial());
    }
};
