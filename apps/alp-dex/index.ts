// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { createApp } from './src/app';
import { createChronikClient } from './src/chronik/createChronik';
import { loadTradedConfig } from './src/config/tradedConfig';
import { FormerInventoryNotify } from './src/inventory/formerInventoryNotify';
import {
    MAINTAIN_DELAY_MS,
    MaintainInventoryError,
    maintainHadActivity,
    maintainInventory,
    type MaintainInventoryResult,
} from './src/inventory/maintain';
import { AsyncQueue } from './src/methods/queue';
import { createTelegramBot, createTelegramOpsSender } from './src/ops/telegram';
import { getFormerInventoryNotice } from './src/ops/telegramMessages';
import { pairSpotPrices } from './src/pricing/quotes';
import { pricingReserveAtoms } from './src/pricing/reserves';
import { loadTradedTokens } from './src/tokens/tradedTokens';
import { createLpWallets } from './src/wallet/accounts';

const logMaintainResult = (
    label: string,
    inventory: MaintainInventoryResult,
): void => {
    if (!maintainHadActivity(inventory)) {
        return;
    }
    console.log(
        `inventory maintain (${label}): cleanup→slush=${inventory.cleanedToSlush} ` +
            `postage=${inventory.fundedPostage} ` +
            `misc→fee=${inventory.sweptMisc} ` +
            `belowDust=${inventory.belowDust} txs=${inventory.txids.length}`,
    );
    for (const [tokenId, units] of Object.entries(inventory.fundedInventory)) {
        console.log(`inventory funded ${units}× ${tokenId.slice(0, 8)}…`);
    }
    for (const pile of inventory.formerInventory) {
        console.warn(
            `inventory maintain (${label}): leaving former inventory ` +
                `${pile.utxoCount}× ${pile.tokenId} @ ${pile.atoms} atoms ` +
                `(not sweeping to fee)`,
        );
    }
};

const logMaintainError = (label: string, error: unknown): void => {
    if (error instanceof MaintainInventoryError) {
        console.error(
            `inventory maintain failed (${label})`,
            error.message,
            `partial txs=${error.partial.txids.length}`,
            `cleanup=${error.partial.cleanedToSlush}`,
            `postage=${error.partial.fundedPostage}`,
            `misc=${error.partial.sweptMisc}`,
            `belowDust=${error.partial.belowDust}`,
            `funded=${JSON.stringify(error.partial.fundedInventory)}`,
            `txids=${error.partial.txids.join(',')}`,
        );
        return;
    }
    console.error(
        `inventory maintain failed (${label})`,
        error instanceof Error ? error.message : String(error),
    );
};

const main = async (): Promise<void> => {
    const tradedConfig = loadTradedConfig();
    const chronik = createChronikClient(tradedConfig.chronikUrls);
    const { seller, slush, addresses } = createLpWallets(
        tradedConfig.mnemonic,
        chronik,
        tradedConfig.feeAddress,
    );

    await Promise.all([seller.sync(), slush.sync()]);
    const tradedTokens = await loadTradedTokens(chronik, tradedConfig);

    const telegram = tradedConfig.telegram;
    const telegramBot =
        telegram === undefined
            ? undefined
            : createTelegramBot(telegram.botToken);
    const telegramOps =
        telegram === undefined || telegramBot === undefined
            ? undefined
            : createTelegramOpsSender(telegramBot, telegram.opsChat);
    if (telegram === undefined) {
        console.log('Telegram not configured — ops alerts disabled');
    } else {
        console.log('Telegram ops alerts enabled');
    }

    // One queue for settle + scheduled/post-settle maintain so they never
    // race on seller UTXO selection / broadcast.
    const walletQueue = new AsyncQueue();
    const formerInventoryNotify = new FormerInventoryNotify();
    const enqueueMaintain = async (label: string): Promise<void> => {
        await walletQueue.enqueue(async () => {
            try {
                const inventory = await maintainInventory({
                    seller,
                    slush,
                    feeAddress: tradedConfig.feeAddress,
                    tradedTokens,
                });
                logMaintainResult(label, inventory);
                if (telegramOps === undefined) {
                    return;
                }
                const started = formerInventoryNotify.begin(
                    label,
                    inventory.formerInventory,
                );
                if (started === null) {
                    return;
                }
                void telegramOps
                    .send(
                        getFormerInventoryNotice({
                            sellerAddress: addresses.sellerAddress,
                            piles: inventory.formerInventory,
                        }),
                    )
                    .then(() => {
                        formerInventoryNotify.complete(started, true);
                    })
                    .catch((error: unknown) => {
                        formerInventoryNotify.complete(started, false);
                        console.error(
                            'Former-inventory Telegram notify failed:',
                            error instanceof Error
                                ? error.message
                                : String(error),
                        );
                    });
            } catch (error: unknown) {
                logMaintainError(label, error);
            }
        });
    };

    // Listen before inventory maintain so a Chronik/broadcast failure does not
    // prevent health / status from coming up (maintain is housekeeping).
    const app = createApp({
        seller,
        slush,
        feeAddress: tradedConfig.feeAddress,
        tradedConfig,
        tradedTokens,
        walletQueue,
        maintainInventory: () => enqueueMaintain('post-settle'),
        sendOps:
            telegramOps === undefined
                ? undefined
                : async message => {
                      await telegramOps.send(message);
                  },
    });
    await new Promise<void>((resolve, reject) => {
        const server = app.listen(tradedConfig.port, () => {
            console.log(
                `alp-dex listening on port ${tradedConfig.port} (${tradedConfig.pairs.length} pair(s))`,
            );
            console.log(`seller ${addresses.sellerAddress}`);
            console.log(`slush  ${addresses.slushAddress}`);
            console.log(`fee    ${addresses.feeAddress}`);
            for (const token of tradedTokens.values()) {
                const reserve = pricingReserveAtoms(
                    seller.utxos,
                    slush.utxos,
                    token.tokenId,
                );
                console.log(
                    `token  ${token.tokenId} ${token.tokenTicker} ` +
                        `decimals=${token.decimals} utxoAtoms=${token.utxoAtoms} ` +
                        `reserveAtoms=${reserve}`,
                );
            }
            for (const pair of tradedConfig.pairs) {
                const tokenA = tradedTokens.get(pair.tokenIdA)!;
                const tokenB = tradedTokens.get(pair.tokenIdB)!;
                const reserveA = pricingReserveAtoms(
                    seller.utxos,
                    slush.utxos,
                    pair.tokenIdA,
                );
                const reserveB = pricingReserveAtoms(
                    seller.utxos,
                    slush.utxos,
                    pair.tokenIdB,
                );
                const { spotAtoB, spotBtoA } = pairSpotPrices(
                    reserveA,
                    reserveB,
                    tokenA.decimals,
                    tokenB.decimals,
                );
                console.log(
                    `pair   ${pair.tokenIdA.slice(0, 8)}…/${pair.tokenIdB.slice(0, 8)}… ` +
                        `feePct=${pair.feePct} reserves=${reserveA}/${reserveB} ` +
                        `spotA→B=${spotAtoB} spotB→A=${spotBtoA}`,
                );
            }
            resolve();
        });
        server.once('error', reject);
    });

    console.log(
        `inventory maintain delay: ${MAINTAIN_DELAY_MS / 1000}s between passes`,
    );
    let label = 'startup';
    for (;;) {
        await enqueueMaintain(label);
        label = 'scheduled';
        await new Promise<void>(resolve => {
            setTimeout(resolve, MAINTAIN_DELAY_MS);
        });
    }
};

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
