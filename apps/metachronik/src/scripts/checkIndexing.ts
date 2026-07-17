// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

/**
 * Read-only indexing health check (incremental UTXO model).
 *
 * Connects to the database using DATABASE_URL from .env and runs sanity
 * queries for block coverage, UTXO supply, address balance consistency,
 * and token UTXO / holder balance consistency.
 *
 * Usage:
 *   pnpm check-indexing
 *   pnpm check-indexing -- --quick
 */
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const MAX_SUPPLY_SATS = 21_000_000_000_000n * 100n;
const QUICK_SAMPLE_SIZE = 1000;
/** Empty-script outputs live in utxos for spend tracking only (no addresses row). */
const ADDRESS_TRACKED_UTXOS = "output_script != ''";

function formatAtoms(atoms: bigint): string {
    return atoms.toLocaleString('en-US');
}

function truncateTokenId(tokenId: string): string {
    return tokenId.length > 16
        ? `${tokenId.slice(0, 8)}…${tokenId.slice(-8)}`
        : tokenId;
}

type Status = 'OK' | 'WARN' | 'INFO';

function hasFlag(name: string): boolean {
    return process.argv.includes(name);
}

function line(status: Status, label: string, detail: string): void {
    const tag =
        status === 'OK' ? '[OK]  ' : status === 'WARN' ? '[WARN]' : '[INFO]';
    console.log(`${tag} ${label}: ${detail}`);
}

function satsToXec(sats: bigint): string {
    const xec = sats / 100n;
    return xec.toLocaleString('en-US');
}

async function tableExists(pool: Pool, tableName: string): Promise<boolean> {
    const result = await pool.query(
        `SELECT to_regclass($1) IS NOT NULL AS exists`,
        [`public.${tableName}`],
    );
    return Boolean(result.rows[0]?.exists);
}

async function main(): Promise<void> {
    const quick = hasFlag('--quick');
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
        statement_timeout: parseInt(
            process.env.CHECK_INDEXING_STATEMENT_TIMEOUT ||
                (quick ? '120000' : '300000'),
            10,
        ),
    });

    let hadWarning = false;
    let hadCriticalFailure = false;
    const warn = (label: string, detail: string) => {
        hadWarning = true;
        line('WARN', label, detail);
    };

    try {
        console.log(
            `\n=== metachronik indexing health check${
                quick ? ' (quick)' : ''
            } ===\n`,
        );

        console.log('--- Block coverage ---');
        const blocks = await pool.query(
            `SELECT COUNT(*)::bigint AS n,
                    MIN(height) AS lo,
                    MAX(height) AS hi
             FROM blocks`,
        );
        const bn = BigInt(blocks.rows[0].n);
        if (bn === 0n) {
            warn('Blocks', 'blocks table is EMPTY — nothing indexed yet');
        } else {
            const lo = Number(blocks.rows[0].lo);
            const hi = Number(blocks.rows[0].hi);
            const expected = BigInt(hi - lo + 1);
            const gaps = expected - bn;
            line(
                'INFO',
                'Blocks',
                `${bn.toLocaleString()} rows, height ${lo.toLocaleString()}–${hi.toLocaleString()}`,
            );
            if (gaps > 0n) {
                warn(
                    'Block gaps',
                    `${gaps.toLocaleString()} missing heights between ${lo} and ${hi}`,
                );
            } else {
                line('OK', 'Block gaps', 'no gaps in indexed height range');
            }
        }

        const latest = await pool.query(
            `SELECT height, timestamp,
                    to_timestamp(timestamp) AT TIME ZONE 'UTC' AS ts_utc
             FROM blocks
             ORDER BY height DESC
             LIMIT 1`,
        );
        if (latest.rows.length > 0) {
            const r = latest.rows[0];
            line(
                'INFO',
                'Latest block',
                `height ${Number(r.height).toLocaleString()} at ${new Date(
                    r.ts_utc,
                ).toISOString()}`,
            );
        }

        if (!quick) {
            const zeroCoinbase = await pool.query(
                `SELECT COUNT(*)::bigint AS n
                 FROM blocks
                 WHERE sum_coinbase_output_sats = 0 AND height > 0`,
            );
            const zc = BigInt(zeroCoinbase.rows[0].n);
            if (zc > 0n) {
                warn(
                    'Coinbase value',
                    `${zc.toLocaleString()} blocks (height>0) have 0 coinbase output`,
                );
            } else {
                line(
                    'OK',
                    'Coinbase value',
                    'every block above genesis has coinbase output value',
                );
            }
        }

        console.log('\n--- Daily aggregation ---');
        const days = await pool.query(
            `SELECT COUNT(*)::bigint AS n, MIN(date) AS lo, MAX(date) AS hi
             FROM days`,
        );
        const dn = BigInt(days.rows[0].n);
        if (dn === 0n) {
            line('INFO', 'Days', 'no aggregated days yet');
        } else {
            line(
                'INFO',
                'Days',
                `${dn.toLocaleString()} days, ${
                    days.rows[0].lo?.toISOString?.().split('T')[0] ??
                    days.rows[0].lo
                } → ${
                    days.rows[0].hi?.toISOString?.().split('T')[0] ??
                    days.rows[0].hi
                }`,
            );
        }

        const staging = await pool.query(
            `SELECT COUNT(*)::bigint AS n FROM day_addresses`,
        );
        const stagingRows = BigInt(staging.rows[0].n);
        line(
            'INFO',
            'DAU staging (day_addresses)',
            `${stagingRows.toLocaleString()} rows (role flags only)`,
        );

        console.log('\n--- UTXO set & balances ---');
        const utxoStats = await pool.query(
            `SELECT COUNT(*)::bigint AS utxo_count,
                    COALESCE(SUM(sats), 0)::bigint AS utxo_total_sats,
                    COUNT(*) FILTER (WHERE output_script = '')::bigint AS orphan_count,
                    COALESCE(SUM(sats) FILTER (WHERE output_script = ''), 0)::bigint AS orphan_sats
             FROM utxos`,
        );
        const utxoCount = BigInt(utxoStats.rows[0].utxo_count);
        const utxoTotalSats = BigInt(utxoStats.rows[0].utxo_total_sats);
        const orphanUtxoCount = BigInt(utxoStats.rows[0].orphan_count);
        const orphanUtxoSats = BigInt(utxoStats.rows[0].orphan_sats);
        const trackedUtxoTotalSats = utxoTotalSats - orphanUtxoSats;
        line(
            'INFO',
            'UTXOs',
            `${utxoCount.toLocaleString()} outputs, ${satsToXec(
                utxoTotalSats,
            )} XEC total`,
        );
        if (orphanUtxoCount > 0n) {
            line(
                'INFO',
                'Orphan UTXOs',
                `${orphanUtxoCount.toLocaleString()} empty-script output(s), ${satsToXec(
                    orphanUtxoSats,
                )} XEC — excluded from address balance checks`,
            );
        }

        const addrCounts = await pool.query(
            `SELECT
                COUNT(*)::bigint AS total,
                COUNT(*) FILTER (WHERE balance_sats > 0)::bigint AS with_balance,
                COALESCE(SUM(balance_sats), 0)::bigint AS address_total_sats,
                COUNT(*) FILTER (WHERE balance_sats < 0)::bigint AS negative,
                COALESCE(MAX(balance_sats), 0)::bigint AS max_bal,
                COUNT(*) FILTER (WHERE is_miner)::bigint AS miners,
                COUNT(*) FILTER (WHERE is_staker)::bigint AS stakers
             FROM addresses`,
        );
        const ac = addrCounts.rows[0];
        const addressTotalSats = BigInt(ac.address_total_sats);
        const negativeBalances = BigInt(ac.negative);
        const maxBal = BigInt(ac.max_bal);

        line(
            'INFO',
            'Addresses',
            `${BigInt(ac.total).toLocaleString()} total, ${BigInt(
                ac.with_balance,
            ).toLocaleString()} with positive balance, ${BigInt(
                ac.miners,
            ).toLocaleString()} miners, ${BigInt(
                ac.stakers,
            ).toLocaleString()} stakers`,
        );

        if (negativeBalances > 0n) {
            hadCriticalFailure = true;
            warn(
                'Negative balances',
                `${negativeBalances.toLocaleString()} addresses have balance_sats < 0`,
            );
        } else {
            line('OK', 'Negative balances', 'no address has balance_sats < 0');
        }

        const driftStats = await pool.query(
            `WITH per_script AS (
                SELECT COALESCE(a.output_script, u.output_script) AS output_script,
                       COALESCE(a.balance_sats, 0)::bigint AS balance_sats,
                       COALESCE(u.utxo_sum, 0)::bigint AS utxo_sum
                FROM addresses a
                FULL OUTER JOIN (
                    SELECT output_script, SUM(sats)::bigint AS utxo_sum
                    FROM utxos
                    WHERE ${ADDRESS_TRACKED_UTXOS}
                    GROUP BY output_script
                ) u ON a.output_script = u.output_script
             )
             SELECT COUNT(*) FILTER (
                        WHERE balance_sats != utxo_sum
                    )::bigint AS violations,
                    COUNT(*)::bigint AS scripts,
                    COALESCE(SUM(balance_sats - utxo_sum), 0)::bigint AS drift_sats
             FROM per_script`,
        );
        const driftRow = driftStats.rows[0];
        const fullViolations = BigInt(driftRow.violations ?? 0);
        const driftSats = BigInt(driftRow.drift_sats ?? 0);
        const globalDrift = addressTotalSats - trackedUtxoTotalSats;

        if (trackedUtxoTotalSats !== addressTotalSats) {
            warn(
                'UTXO vs address totals',
                `SUM(utxos.sats) for tracked scripts=${satsToXec(
                    trackedUtxoTotalSats,
                )} XEC but SUM(addresses.balance_sats)=${satsToXec(
                    addressTotalSats,
                )} XEC (drift ${satsToXec(
                    globalDrift < 0n ? -globalDrift : globalDrift,
                )} XEC, addresses ${globalDrift > 0n ? 'high' : 'low'})`,
            );
            line(
                'INFO',
                'Per-script drift (full)',
                `${fullViolations.toLocaleString()} of ${BigInt(
                    driftRow.scripts ?? 0,
                ).toLocaleString()} scripts mismatch; net drift ${satsToXec(
                    driftSats < 0n ? -driftSats : driftSats,
                )} XEC`,
            );
            if (fullViolations > 0n) {
                hadCriticalFailure = true;
            }
        } else if (bn > 0n) {
            line(
                'OK',
                'UTXO vs address totals',
                `tracked SUM(utxos.sats) matches SUM(addresses.balance_sats) (${satsToXec(
                    trackedUtxoTotalSats,
                )} XEC)`,
            );
        }

        if (fullViolations > 0n) {
            const samples = await pool.query(
                `WITH per_script AS (
                    SELECT COALESCE(a.output_script, u.output_script) AS output_script,
                           COALESCE(a.balance_sats, 0)::bigint AS balance_sats,
                           COALESCE(u.utxo_sum, 0)::bigint AS utxo_sum
                    FROM addresses a
                    FULL OUTER JOIN (
                        SELECT output_script, SUM(sats)::bigint AS utxo_sum
                        FROM utxos
                        WHERE ${ADDRESS_TRACKED_UTXOS}
                        GROUP BY output_script
                    ) u ON a.output_script = u.output_script
                 )
                 SELECT output_script, balance_sats, utxo_sum,
                        balance_sats - utxo_sum AS drift
                 FROM per_script
                 WHERE balance_sats != utxo_sum
                 ORDER BY ABS(balance_sats - utxo_sum) DESC
                 LIMIT 5`,
            );
            for (const r of samples.rows) {
                const script: string = r.output_script;
                const shortScript =
                    script.length > 32 ? `${script.slice(0, 32)}…` : script;
                line(
                    'INFO',
                    'Drift sample',
                    `${shortScript} balance=${BigInt(
                        r.balance_sats,
                    ).toLocaleString()} utxo=${BigInt(
                        r.utxo_sum,
                    ).toLocaleString()} drift=${BigInt(
                        r.drift,
                    ).toLocaleString()} sats`,
                );
            }
        }

        if (utxoTotalSats > MAX_SUPPLY_SATS) {
            warn('UTXO supply', `exceeds max supply (~21T XEC) — counting bug`);
        }
        if (maxBal > MAX_SUPPLY_SATS) {
            warn(
                'Max single balance',
                `${satsToXec(maxBal)} XEC exceeds total supply`,
            );
        }

        const reconcileSql = quick
            ? `WITH sample AS (
                    SELECT output_script
                    FROM addresses
                    WHERE balance_sats > 0
                    ORDER BY random()
                    LIMIT ${QUICK_SAMPLE_SIZE}
               ),
               per_script AS (
                    SELECT s.output_script,
                           a.balance_sats,
                           COALESCE(u.utxo_sum, 0)::bigint AS utxo_sum
                    FROM sample s
                    JOIN addresses a ON a.output_script = s.output_script
                    LEFT JOIN (
                        SELECT output_script, SUM(sats) AS utxo_sum
                        FROM utxos
                        WHERE ${ADDRESS_TRACKED_UTXOS}
                        GROUP BY output_script
                    ) u ON u.output_script = s.output_script
               )
               SELECT COUNT(*) FILTER (
                          WHERE balance_sats != utxo_sum
                      )::bigint AS violations,
                      COUNT(*)::bigint AS sampled
               FROM per_script`
            : `WITH per_script AS (
                    SELECT a.output_script,
                           a.balance_sats,
                           COALESCE(u.utxo_sum, 0)::bigint AS utxo_sum
                    FROM addresses a
                    LEFT JOIN (
                        SELECT output_script, SUM(sats) AS utxo_sum
                        FROM utxos
                        WHERE ${ADDRESS_TRACKED_UTXOS}
                        GROUP BY output_script
                    ) u ON u.output_script = a.output_script
                    WHERE a.balance_sats > 0 OR u.utxo_sum IS NOT NULL
               )
               SELECT COUNT(*) FILTER (
                          WHERE balance_sats != utxo_sum
                      )::bigint AS violations,
                      COUNT(*)::bigint AS sampled
               FROM per_script`;

        const reconcile = await pool.query(reconcileSql);
        const violations = BigInt(reconcile.rows[0].violations);
        const sampled = BigInt(reconcile.rows[0].sampled ?? 0);
        const reconcileLabel = quick
            ? `Per-script reconcile (sample ${QUICK_SAMPLE_SIZE})`
            : 'Per-script reconcile (full)';

        if (violations > 0n) {
            warn(
                reconcileLabel,
                `${violations.toLocaleString()} of ${sampled.toLocaleString()} scripts: balance_sats != SUM(utxos)`,
            );
        } else if (sampled > 0n) {
            line(
                'OK',
                reconcileLabel,
                `${sampled.toLocaleString()} scripts checked — all match`,
            );
        } else if (bn > 0n && utxoCount === 0n) {
            warn(
                reconcileLabel,
                'blocks indexed but utxos table is empty — UTXO apply may be broken',
            );
        }

        console.log('\n--- Token UTXO set & balances ---');
        const hasTokenTables = await tableExists(pool, 'token_utxos');
        if (!hasTokenTables) {
            line(
                'INFO',
                'Token tables',
                'not migrated yet — restart indexer after `pnpm build` to create schema',
            );
        } else {
            const tokenUtxoStats = await pool.query(
                `SELECT COUNT(*)::bigint AS utxo_count,
                        COUNT(DISTINCT token_id)::bigint AS token_count,
                        COALESCE(SUM(atoms), 0)::text AS utxo_total_atoms
                 FROM token_utxos`,
            );
            const tokenUtxoCount = BigInt(tokenUtxoStats.rows[0].utxo_count);
            const distinctTokens = BigInt(tokenUtxoStats.rows[0].token_count);
            const tokenUtxoTotalAtoms = BigInt(
                tokenUtxoStats.rows[0].utxo_total_atoms,
            );

            const tokenBalStats = await pool.query(
                `SELECT COUNT(*)::bigint AS balance_rows,
                    COUNT(*) FILTER (WHERE atoms > 0)::bigint AS holders,
                    COALESCE(SUM(atoms), 0)::text AS balance_total_atoms,
                    COUNT(*) FILTER (WHERE atoms < 0)::bigint AS negative
             FROM token_balances`,
            );
            const tokenBalanceRows = BigInt(tokenBalStats.rows[0].balance_rows);
            const tokenHolders = BigInt(tokenBalStats.rows[0].holders);
            const tokenBalanceTotalAtoms = BigInt(
                tokenBalStats.rows[0].balance_total_atoms,
            );
            const negativeTokenBalances = BigInt(
                tokenBalStats.rows[0].negative,
            );

            const tokensRegistry = await pool.query(
                `SELECT COUNT(*)::bigint AS n FROM tokens`,
            );
            const tokensTableCount = BigInt(tokensRegistry.rows[0].n);

            if (tokenUtxoCount === 0n) {
                line(
                    'INFO',
                    'Token UTXOs',
                    'none yet (expected before ~block 500k token activity)',
                );
            } else {
                line(
                    'INFO',
                    'Token UTXOs',
                    `${tokenUtxoCount.toLocaleString()} outputs across ${distinctTokens.toLocaleString()} token(s), ${formatAtoms(
                        tokenUtxoTotalAtoms,
                    )} atoms total`,
                );
                line(
                    'INFO',
                    'Token balances',
                    `${tokenBalanceRows.toLocaleString()} rows, ${tokenHolders.toLocaleString()} with atoms > 0; tokens registry: ${tokensTableCount.toLocaleString()}`,
                );

                if (negativeTokenBalances > 0n) {
                    hadCriticalFailure = true;
                    warn(
                        'Negative token balances',
                        `${negativeTokenBalances.toLocaleString()} holder rows have atoms < 0`,
                    );
                } else {
                    line(
                        'OK',
                        'Negative token balances',
                        'no holder row has atoms < 0',
                    );
                }

                const tokenDriftStats = await pool.query(
                    `WITH per_token AS (
                    SELECT COALESCE(u.token_id, b.token_id) AS token_id,
                           COALESCE(u.utxo_sum, 0)::bigint AS utxo_sum,
                           COALESCE(b.balance_sum, 0)::bigint AS balance_sum
                    FROM (
                        SELECT token_id, SUM(atoms)::text AS utxo_sum
                        FROM token_utxos
                        GROUP BY token_id
                    ) u
                    FULL OUTER JOIN (
                        SELECT token_id, SUM(atoms)::text AS balance_sum
                        FROM token_balances
                        GROUP BY token_id
                    ) b ON u.token_id = b.token_id
                 )
                 SELECT COUNT(*) FILTER (
                            WHERE utxo_sum != balance_sum
                        )::bigint AS violations,
                        COUNT(*)::bigint AS tokens,
                        COALESCE(SUM(balance_sum - utxo_sum), 0)::text AS drift_atoms
                 FROM per_token`,
                );
                const tokenDriftRow = tokenDriftStats.rows[0];
                const tokenGlobalViolations = BigInt(
                    tokenDriftRow.violations ?? 0,
                );
                const tokenGlobalDrift = BigInt(tokenDriftRow.drift_atoms ?? 0);
                const globalTokenDrift =
                    tokenBalanceTotalAtoms - tokenUtxoTotalAtoms;

                if (tokenUtxoTotalAtoms !== tokenBalanceTotalAtoms) {
                    warn(
                        'Token UTXO vs balance totals',
                        `SUM(token_utxos.atoms)=${formatAtoms(
                            tokenUtxoTotalAtoms,
                        )} but SUM(token_balances.atoms)=${formatAtoms(
                            tokenBalanceTotalAtoms,
                        )} (drift ${formatAtoms(
                            globalTokenDrift < 0n
                                ? -globalTokenDrift
                                : globalTokenDrift,
                        )} atoms, balances ${globalTokenDrift > 0n ? 'high' : 'low'})`,
                    );
                    line(
                        'INFO',
                        'Per-token drift (full)',
                        `${tokenGlobalViolations.toLocaleString()} of ${BigInt(
                            tokenDriftRow.tokens ?? 0,
                        ).toLocaleString()} tokens mismatch; net drift ${formatAtoms(
                            tokenGlobalDrift < 0n
                                ? -tokenGlobalDrift
                                : tokenGlobalDrift,
                        )} atoms`,
                    );
                } else {
                    line(
                        'OK',
                        'Token UTXO vs balance totals',
                        `SUM(token_utxos.atoms) matches SUM(token_balances.atoms) (${formatAtoms(
                            tokenUtxoTotalAtoms,
                        )} atoms)`,
                    );
                }

                const holderDriftStats = await pool.query(
                    `WITH per_holder AS (
                    SELECT COALESCE(b.token_id, u.token_id) AS token_id,
                           COALESCE(b.output_script, u.output_script) AS output_script,
                           COALESCE(b.is_mint_baton, u.is_mint_baton) AS is_mint_baton,
                           COALESCE(b.atoms, 0)::numeric AS balance_atoms,
                           COALESCE(u.utxo_sum, 0)::numeric AS utxo_sum
                    FROM token_balances b
                    FULL OUTER JOIN (
                        SELECT token_id, output_script, is_mint_baton,
                               SUM(atoms)::numeric AS utxo_sum
                        FROM token_utxos
                        GROUP BY token_id, output_script, is_mint_baton
                    ) u ON b.token_id = u.token_id
                       AND b.output_script = u.output_script
                       AND b.is_mint_baton = u.is_mint_baton
                 )
                 SELECT COUNT(*) FILTER (
                            WHERE balance_atoms != utxo_sum
                        )::bigint AS violations,
                        COUNT(*)::bigint AS holders,
                        COALESCE(SUM(balance_atoms - utxo_sum), 0)::text AS drift_atoms
                 FROM per_holder`,
                );
                const holderDriftRow = holderDriftStats.rows[0];
                const tokenHolderViolations = BigInt(
                    holderDriftRow.violations ?? 0,
                );
                const tokenHolderDrift = BigInt(
                    holderDriftRow.drift_atoms ?? 0,
                );

                if (tokenHolderViolations > 0n) {
                    hadCriticalFailure = true;
                    line(
                        'INFO',
                        'Per-holder token drift (full)',
                        `${tokenHolderViolations.toLocaleString()} of ${BigInt(
                            holderDriftRow.holders ?? 0,
                        ).toLocaleString()} holder rows mismatch; net drift ${formatAtoms(
                            tokenHolderDrift < 0n
                                ? -tokenHolderDrift
                                : tokenHolderDrift,
                        )} atoms`,
                    );
                    const tokenSamples = await pool.query(
                        `WITH per_holder AS (
                        SELECT COALESCE(b.token_id, u.token_id) AS token_id,
                               COALESCE(b.output_script, u.output_script) AS output_script,
                               COALESCE(b.is_mint_baton, u.is_mint_baton) AS is_mint_baton,
                               COALESCE(b.atoms, 0)::numeric AS balance_atoms,
                               COALESCE(u.utxo_sum, 0)::numeric AS utxo_sum
                        FROM token_balances b
                        FULL OUTER JOIN (
                            SELECT token_id, output_script, is_mint_baton,
                                   SUM(atoms)::numeric AS utxo_sum
                            FROM token_utxos
                            GROUP BY token_id, output_script, is_mint_baton
                        ) u ON b.token_id = u.token_id
                           AND b.output_script = u.output_script
                           AND b.is_mint_baton = u.is_mint_baton
                     )
                     SELECT token_id, balance_atoms, utxo_sum,
                            balance_atoms - utxo_sum AS drift,
                            is_mint_baton
                     FROM per_holder
                     WHERE balance_atoms != utxo_sum
                     ORDER BY ABS(balance_atoms - utxo_sum) DESC
                     LIMIT 5`,
                    );
                    for (const r of tokenSamples.rows) {
                        line(
                            'INFO',
                            'Token drift sample',
                            `${truncateTokenId(r.token_id as string)}${
                                r.is_mint_baton ? ' (baton)' : ''
                            } balance=${formatAtoms(
                                BigInt(r.balance_atoms),
                            )} utxo=${formatAtoms(BigInt(r.utxo_sum))} drift=${formatAtoms(
                                BigInt(r.drift),
                            )} atoms`,
                        );
                    }
                }

                const tokenReconcileSql = quick
                    ? `WITH sample AS (
                        SELECT token_id, output_script, is_mint_baton
                        FROM token_balances
                        WHERE atoms > 0
                        ORDER BY random()
                        LIMIT ${QUICK_SAMPLE_SIZE}
                   ),
                   per_holder AS (
                        SELECT s.token_id, s.output_script, s.is_mint_baton,
                               b.atoms AS balance_atoms,
                               COALESCE(u.utxo_sum, 0)::numeric AS utxo_sum
                        FROM sample s
                        JOIN token_balances b
                          ON b.token_id = s.token_id
                         AND b.output_script = s.output_script
                         AND b.is_mint_baton = s.is_mint_baton
                        LEFT JOIN (
                            SELECT token_id, output_script, is_mint_baton,
                                   SUM(atoms) AS utxo_sum
                            FROM token_utxos
                            GROUP BY token_id, output_script, is_mint_baton
                        ) u ON u.token_id = s.token_id
                           AND u.output_script = s.output_script
                           AND u.is_mint_baton = s.is_mint_baton
                   )
                   SELECT COUNT(*) FILTER (
                              WHERE balance_atoms != utxo_sum
                          )::bigint AS violations,
                          COUNT(*)::bigint AS sampled
                   FROM per_holder`
                    : `WITH per_holder AS (
                        SELECT b.token_id, b.output_script, b.is_mint_baton,
                               b.atoms AS balance_atoms,
                               COALESCE(u.utxo_sum, 0)::numeric AS utxo_sum
                        FROM token_balances b
                        LEFT JOIN (
                            SELECT token_id, output_script, is_mint_baton,
                                   SUM(atoms) AS utxo_sum
                            FROM token_utxos
                            GROUP BY token_id, output_script, is_mint_baton
                        ) u ON u.token_id = b.token_id
                           AND u.output_script = b.output_script
                           AND u.is_mint_baton = b.is_mint_baton
                        WHERE b.atoms > 0 OR u.utxo_sum IS NOT NULL
                   )
                   SELECT COUNT(*) FILTER (
                              WHERE balance_atoms != utxo_sum
                          )::bigint AS violations,
                          COUNT(*)::bigint AS sampled
                   FROM per_holder`;

                const tokenReconcile = await pool.query(tokenReconcileSql);
                const tokenViolations = BigInt(
                    tokenReconcile.rows[0].violations,
                );
                const tokenSampled = BigInt(
                    tokenReconcile.rows[0].sampled ?? 0,
                );
                const tokenReconcileLabel = quick
                    ? `Per-holder token reconcile (sample ${QUICK_SAMPLE_SIZE})`
                    : 'Per-holder token reconcile (full)';

                if (tokenViolations > 0n) {
                    hadCriticalFailure = true;
                    warn(
                        tokenReconcileLabel,
                        `${tokenViolations.toLocaleString()} of ${tokenSampled.toLocaleString()} holder rows: atoms != SUM(token_utxos)`,
                    );
                } else if (tokenSampled > 0n) {
                    line(
                        'OK',
                        tokenReconcileLabel,
                        `${tokenSampled.toLocaleString()} holder rows checked — all match`,
                    );
                }
            }
        }

        if (!quick) {
            const dummy = await pool.query(
                `SELECT balance_sats AS bal
                 FROM addresses
                 WHERE output_script = '76a914000000000000000000000000000000000000000088ac'`,
            );
            if (dummy.rows.length > 0) {
                line(
                    'INFO',
                    'All-zero burn address',
                    `holds ${satsToXec(
                        BigInt(dummy.rows[0].bal),
                    )} XEC (legitimate burn sink)`,
                );
            }

            console.log('\n--- Top 10 addresses by balance ---');
            const top = await pool.query(
                `SELECT output_script, balance_sats,
                        is_miner, is_staker, is_coinbase_recipient
                 FROM addresses
                 WHERE balance_sats > 0
                 ORDER BY balance_sats DESC
                 LIMIT 10`,
            );
            if (top.rows.length === 0) {
                line(
                    'INFO',
                    'Top 10',
                    'no addresses with positive balance yet',
                );
            } else {
                top.rows.forEach((r, i) => {
                    const tags = [
                        r.is_miner ? 'miner' : null,
                        r.is_staker ? 'staker' : null,
                        r.is_coinbase_recipient ? 'coinbase' : null,
                    ]
                        .filter(Boolean)
                        .join(',');
                    const script: string = r.output_script;
                    const shortScript =
                        script.length > 32 ? `${script.slice(0, 32)}…` : script;
                    console.log(
                        `  ${String(i + 1).padStart(2)}. ${satsToXec(
                            BigInt(r.balance_sats),
                        ).padStart(
                            18,
                        )} XEC  ${shortScript}${tags ? `  (${tags})` : ''}`,
                    );
                });
            }
        }

        console.log('\n=== Summary ===');
        if (hadCriticalFailure) {
            console.log(
                'UTXO/balance invariant failed — per-script or per-holder token drift detected (exit 2).\n',
            );
            process.exitCode = 2;
        } else if (hadWarning) {
            console.log(
                'One or more WARN checks failed — investigate before trusting the data.\n',
            );
            process.exitCode = 1;
        } else {
            console.log('All checks passed.\n');
        }
    } catch (error) {
        console.error(
            '\nCheck failed to run:',
            error instanceof Error ? error.message : error,
        );
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

void main();
