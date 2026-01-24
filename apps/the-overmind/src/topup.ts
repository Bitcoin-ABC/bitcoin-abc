// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';
import { ChronikClient } from 'chronik-client';
import { Wallet } from 'ecash-wallet';
import { Script, payment, toHex, DEFAULT_DUST_SATS } from 'ecash-lib';
import { Bot } from 'grammy';
import { TARGET_XEC_SATS } from './constants';

/**
 * Top up all user addresses to 1000 XEC
 * Sends a single transaction from the admin wallet with XEC outputs for each user
 * that needs topping up
 * @param wallet - Admin wallet to send from
 * @param chronik - Chronik client for checking balances
 * @param pool - Database connection pool
 * @param dryRun - If true, inspect the transaction without broadcasting (default: true)
 * @param bot - Optional Telegram bot instance for sending admin notifications
 * @param adminChatId - Optional admin chat ID for sending notifications
 */
export const topupUserAddresses = async (
    wallet: Wallet,
    chronik: ChronikClient,
    pool: Pool,
    dryRun = true,
    bot?: Bot,
    adminChatId?: string,
): Promise<void> => {
    console.info('Starting user address topup...');

    try {
        // Get all users from database
        const usersResult = await pool.query(
            'SELECT user_tg_id, address FROM users ORDER BY user_tg_id',
        );

        if (usersResult.rows.length === 0) {
            console.info('No users found in database');
            return;
        }

        console.info(
            `Found ${usersResult.rows.length} users, checking balances...`,
        );

        // Check each user's balance and calculate topup amounts
        const topupOutputs: Array<{ script: Script; sats: bigint }> = [];
        const topupInfo: Array<{
            user_id: number;
            address: string;
            balance_sats: bigint;
            top_up_sats: bigint;
        }> = [];
        let usersNeedingTopup = 0;
        let totalTopupSats = 0n;

        for (const row of usersResult.rows) {
            const address = row.address as string;
            const userId =
                typeof row.user_tg_id === 'bigint'
                    ? Number(row.user_tg_id)
                    : row.user_tg_id;

            try {
                // Get UTXOs for this address
                const utxosRes = await chronik.address(address).utxos();
                const utxos = utxosRes.utxos || [];

                // Sum up XEC balance (sats) from all UTXOs
                let currentBalanceSats = 0n;
                for (const utxo of utxos) {
                    // Only count XEC (non-token UTXOs)
                    if (!utxo.token) {
                        currentBalanceSats += BigInt(utxo.sats || 0);
                    }
                }

                // Calculate how much is needed to reach target
                if (currentBalanceSats < TARGET_XEC_SATS) {
                    const topupAmount = TARGET_XEC_SATS - currentBalanceSats;
                    // Skip if topup amount is below dust limit (546 sats)
                    // as the transaction would be rejected by the mempool
                    if (topupAmount >= DEFAULT_DUST_SATS) {
                        topupOutputs.push({
                            script: Script.fromAddress(address),
                            sats: topupAmount,
                        });
                        topupInfo.push({
                            user_id: userId,
                            address,
                            balance_sats: currentBalanceSats,
                            top_up_sats: topupAmount,
                        });
                        usersNeedingTopup++;
                        totalTopupSats += topupAmount;
                    }
                }
            } catch (err) {
                console.error(
                    `Error checking balance for user ${userId} (${address}):`,
                    err,
                );
                // Continue with other users even if one fails
            }
        }

        if (topupOutputs.length === 0) {
            console.info('No users need topping up');
            return;
        }

        // Log all outputs in a legible way
        console.info('\n=== Topup Summary ===');
        console.info(
            `Users needing topup: ${usersNeedingTopup} (total: ${Number(totalTopupSats) / 100} XEC)\n`,
        );
        console.info('User ID | Balance (XEC) | Top-up (XEC) | Address');
        console.info(
            '--------|---------------|--------------|--------------------------------',
        );
        for (const info of topupInfo) {
            const balanceXec = Number(info.balance_sats) / 100;
            const topupXec = Number(info.top_up_sats) / 100;
            const userIdStr = info.user_id.toString();
            const balanceStr = balanceXec.toFixed(2);
            const topupStr = topupXec.toFixed(2);
            console.info(
                `${userIdStr.padEnd(7)} | ${balanceStr.padStart(13)} | ${topupStr.padStart(12)} | ${info.address}`,
            );
        }
        console.info('');

        // Sync wallet to ensure we have latest balance
        await wallet.sync();

        // Build transaction with all topup outputs
        const topupAction: payment.Action = {
            outputs: topupOutputs,
        };

        if (dryRun) {
            console.info(
                '🔍 DRY RUN MODE - Inspecting transaction without broadcasting...\n',
            );
            const inspectAction = wallet.action(topupAction).inspect();

            // Log raw transaction hex for each tx
            for (let i = 0; i < inspectAction.txs.length; i++) {
                const builtTx = inspectAction.txs[i];
                const rawTxHex = toHex(builtTx.tx.ser());
                console.info(
                    `Transaction ${i + 1} of ${inspectAction.txs.length}:`,
                );
                console.info(`  TXID: ${builtTx.txid}`);
                console.info(`  Size: ${builtTx.size()} bytes`);
                console.info(
                    `  Fee: ${builtTx.fee()} sats (${Number(builtTx.fee()) / 100} XEC)`,
                );
                console.info(`  Raw TX Hex:`);
                console.info(rawTxHex);
                console.info('');
            }

            console.info(
                '✅ Dry run completed - transaction was NOT broadcast',
            );
        } else {
            console.info(
                `🚀 LIVE MODE - Sending topup transaction to ${usersNeedingTopup} users (total: ${Number(totalTopupSats) / 100} XEC)...\n`,
            );

            // Build and broadcast the transaction
            const result = await wallet.action(topupAction).build().broadcast();

            if (!result.success) {
                const errorMsg = `Failed to broadcast topup transaction: ${result.errors?.join(', ') ?? 'unknown error'}`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }

            const txid = result.broadcasted[0];
            console.info(`✅ Successfully sent topup transaction: ${txid}`);
            console.info(
                `   Topped up ${usersNeedingTopup} users with ${Number(totalTopupSats) / 100} XEC total`,
            );

            // Send notification to admin chat if bot and adminChatId are provided
            if (bot && adminChatId) {
                try {
                    const totalXec = Number(totalTopupSats) / 100;
                    await bot.api.sendMessage(
                        adminChatId,
                        `✅ 1000 XEC top-up transaction sent to ${usersNeedingTopup} users (total: ${totalXec.toFixed(2)} XEC)\n\n[View on explorer](https://explorer.e.cash/tx/${txid})`,
                        {
                            parse_mode: 'Markdown',
                            link_preview_options: { is_disabled: true },
                        },
                    );
                } catch (err) {
                    console.error(
                        'Error sending topup notification to admin channel:',
                        err,
                    );
                }
            }
        }
    } catch (err) {
        const errorMsg = `Error in topupUserAddresses: ${err instanceof Error ? err.message : String(err)}`;
        console.error(errorMsg);
        throw err;
    }
};
