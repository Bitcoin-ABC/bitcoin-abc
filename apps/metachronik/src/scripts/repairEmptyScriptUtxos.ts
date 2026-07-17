// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Backfill empty-script UTXOs missing from blocks indexed before the
 * empty-script tracking fix (blocks were committed without the utxo row).
 *
 * Usage:
 *   pnpm repair-empty-script-utxos
 *   pnpm repair-empty-script-utxos -- --yes
 */
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { emptyScriptUtxosAtBlockEnd } from '../services/emptyScriptUtxos';
import { txidHexToBuffer } from '../services/utxoTypes';

dotenv.config();

function hasFlag(name: string): boolean {
    return process.argv.includes(name);
}

function parseArg(name: string): number | undefined {
    const idx = process.argv.indexOf(name);
    if (idx === -1 || idx + 1 >= process.argv.length) {
        return undefined;
    }
    const value = Number(process.argv[idx + 1]);
    return Number.isFinite(value) ? value : undefined;
}

async function getAllBlockTxs(
    chronik: ChronikClient,
    height: number,
): Promise<any[]> {
    const probe = await chronik.blockTxs(height, 0, 1);
    const numTxs = probe.numTxs ?? 0;
    if (numTxs <= 200) {
        const response = await chronik.blockTxs(height, 0, numTxs);
        return response.txs || [];
    }

    const allTxs: any[] = [];
    let page = 0;
    const pageSize = 200;
    while (true) {
        const response = await chronik.blockTxs(height, page, pageSize);
        if (!response.txs || response.txs.length === 0) {
            break;
        }
        allTxs.push(...response.txs);
        if (response.txs.length < pageSize) {
            break;
        }
        page += 1;
    }
    return allTxs;
}

async function main(): Promise<void> {
    const apply = hasFlag('--yes') || hasFlag('-y');
    const databaseUrl = process.env.DATABASE_URL;
    const chronikUrls = (process.env.CHRONIK_URLS || '')
        .split(',')
        .map(url => url.trim())
        .filter(Boolean);

    if (!databaseUrl) {
        console.error('DATABASE_URL is not set in .env');
        process.exit(1);
    }
    if (chronikUrls.length === 0) {
        console.error('CHRONIK_URLS is not set in .env');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=require')
            ? { rejectUnauthorized: false }
            : undefined,
    });

    const chronik = await ChronikClient.useStrategy(
        ConnectionStrategy.ClosestFirst,
        chronikUrls,
    );

    try {
        const maxHeightResult = await pool.query(
            'SELECT MAX(height)::integer AS max_height FROM blocks',
        );
        const dbMaxHeight: number | null =
            maxHeightResult.rows[0]?.max_height ?? null;
        if (dbMaxHeight === null) {
            console.log('No indexed blocks in database.');
            return;
        }

        const fromHeight = parseArg('--from') ?? 0;
        const toHeight = parseArg('--to') ?? dbMaxHeight;
        const batchSizeArg = parseArg('--batch-size') ?? 100;
        const batchSize = Math.max(1, Math.floor(batchSizeArg));

        console.log(
            `\n=== repair empty-script utxos (${apply ? 'APPLY' : 'dry run'}) ===`,
        );
        console.log(
            `Scanning indexed blocks ${fromHeight.toLocaleString()} → ${toHeight.toLocaleString()} (db tip ${dbMaxHeight.toLocaleString()})\n`,
        );

        const missing: Array<{
            height: number;
            txid: string;
            vout: number;
            sats: bigint;
        }> = [];

        for (let start = fromHeight; start <= toHeight; start += batchSize) {
            const end = Math.min(start + batchSize - 1, toHeight);
            process.stdout.write(
                `\rScanning blocks ${start.toLocaleString()} → ${end.toLocaleString()}...`,
            );

            for (let height = start; height <= end; height++) {
                const blockTxs = await getAllBlockTxs(chronik, height);
                const creates = emptyScriptUtxosAtBlockEnd(blockTxs);
                if (creates.length === 0) {
                    continue;
                }

                for (const create of creates) {
                    const exists = await pool.query(
                        `SELECT 1 FROM utxos
                         WHERE txid = $1 AND vout = $2`,
                        [txidHexToBuffer(create.txid), create.vout],
                    );
                    if (exists.rowCount === 0) {
                        missing.push({
                            height,
                            txid: create.txid,
                            vout: create.vout,
                            sats: create.sats,
                        });
                    }
                }
            }
        }

        process.stdout.write('\n');
        if (missing.length === 0) {
            console.log('No missing empty-script utxos found.');
            return;
        }

        console.log(`Found ${missing.length} missing empty-script utxo(s):`);
        for (const row of missing) {
            console.log(
                `  height ${row.height}: ${row.txid}:${row.vout} (${row.sats.toString()} sats)`,
            );
        }

        if (!apply) {
            console.log('\nDry run only. Re-run with --yes to insert rows.');
            return;
        }

        for (const row of missing) {
            await pool.query(
                `INSERT INTO utxos (txid, vout, output_script, sats, created_height)
                 VALUES ($1, $2, '', $3, $4)
                 ON CONFLICT (txid, vout) DO NOTHING`,
                [txidHexToBuffer(row.txid), row.vout, row.sats, row.height],
            );
        }

        console.log(`\nInserted ${missing.length} utxo row(s).`);
    } finally {
        await pool.end();
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
