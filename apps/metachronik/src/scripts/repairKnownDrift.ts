// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Surgical repair for balance drift from pre-BIP34 duplicate coinbase txids.
 *
 * Does not touch utxos (one row per outpoint is correct for our schema).
 * Subtracts the duplicate balance credit on each known script.
 *
 * Usage:
 *   pnpm repair-known-drift           # dry run
 *   pnpm repair-known-drift -- --yes  # apply
 */
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { KNOWN_DUPLICATE_COINBASES } from '../services/knownDuplicateCoinbases';

dotenv.config();

function hasFlag(name: string): boolean {
    return process.argv.includes(name);
}

async function main(): Promise<void> {
    const apply = hasFlag('--yes') || hasFlag('-y');
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('DATABASE_URL is not set in .env');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=require')
            ? { rejectUnauthorized: false }
            : undefined,
    });

    try {
        console.log(
            `\n=== repair known duplicate-coinbase drift (${apply ? 'APPLY' : 'dry run'}) ===\n`,
        );

        let totalCorrection = 0n;
        const updates: Array<{
            script: string;
            txid: string;
            balance: bigint;
            utxoSum: bigint;
            correction: bigint;
        }> = [];

        for (const entry of KNOWN_DUPLICATE_COINBASES) {
            const result = await pool.query(
                `SELECT a.balance_sats::bigint AS balance_sats,
                        COALESCE(u.utxo_sum, 0)::bigint AS utxo_sum
                 FROM addresses a
                 LEFT JOIN (
                     SELECT output_script, SUM(sats)::bigint AS utxo_sum
                     FROM utxos
                     WHERE output_script = $1
                     GROUP BY output_script
                 ) u ON a.output_script = u.output_script
                 WHERE a.output_script = $1`,
                [entry.outputScript],
            );

            if (result.rowCount === 0) {
                console.log(
                    `[SKIP] ${entry.txid.slice(0, 16)}… — script not in addresses`,
                );
                continue;
            }

            const row = result.rows[0];
            const balance = BigInt(row.balance_sats);
            const utxoSum = BigInt(row.utxo_sum);
            const drift = balance - utxoSum;
            const expectedDrift = entry.subsidySats;

            console.log(`txid ${entry.txid}`);
            console.log(`  heights: ${entry.heights.join(', ')}`);
            console.log(`  balance_sats: ${balance.toLocaleString()}`);
            console.log(`  utxo sum:     ${utxoSum.toLocaleString()}`);
            console.log(
                `  drift:        ${drift.toLocaleString()} (expected ${expectedDrift.toLocaleString()})`,
            );

            if (drift === 0n) {
                console.log('  [OK] already aligned\n');
                continue;
            }

            if (drift !== expectedDrift) {
                console.error(
                    `  [ABORT] unexpected drift; manual investigation required\n`,
                );
                process.exit(1);
            }

            updates.push({
                script: entry.outputScript,
                txid: entry.txid,
                balance,
                utxoSum,
                correction: expectedDrift,
            });
            totalCorrection += expectedDrift;
        }

        if (updates.length === 0) {
            console.log('Nothing to repair.');
            return;
        }

        console.log(
            `Will subtract ${totalCorrection.toLocaleString()} sats (${(totalCorrection / 100n).toLocaleString()} XEC) across ${updates.length} script(s).`,
        );

        if (!apply) {
            console.log('\nDry run only. Re-run with --yes to apply.\n');
            return;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const update of updates) {
                await client.query(
                    `UPDATE addresses
                     SET balance_sats = balance_sats - $1
                     WHERE output_script = $2`,
                    [update.correction.toString(), update.script],
                );
            }
            await client.query('COMMIT');
            console.log(
                '\nRepair applied. Run: pnpm check-indexing -- --quick\n',
            );
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } finally {
        await pool.end();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
