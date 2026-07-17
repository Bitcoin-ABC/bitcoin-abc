// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Pool } from 'pg';

// Database row interfaces
interface DailyStatsRow {
    date: string;
    total_blocks: string | number;
    total_transactions: string | number;
    avg_block_size: string | number;
}

interface DailyCoinbaseStatsRow {
    date: string;
    sum_coinbase_output_sats: string | number;
    miner_reward_sats: string | number;
    staking_reward_sats: string | number;
    ifp_reward_sats: string | number;
}

interface DailyClaimsRow {
    date: string;
    cachet_claims: string | number;
    cashtab_faucet_claims: string | number;
}

interface CumulativeClaimsRow {
    date: string;
    cumulative_cachet_claims: string | number;
    cumulative_cashtab_faucet_claims: string | number;
}

interface DailyBinanceWithdrawalsRow {
    date: string;
    withdrawal_count: string | number;
    withdrawal_sats: string | number;
}

interface DailyAgoraVolumeRow {
    date: string;
    agora_volume_sats: string | number;
    agora_volume_xecx_sats: string | number;
    agora_volume_firma_sats: string | number;
}

interface CumulativeAgoraVolumeRow {
    date: string;
    cumulative_total: string | number;
    cumulative_xecx: string | number;
    cumulative_firma: string | number;
}

interface DailyTokenTypeRow {
    date: string;
    tx_count_alp_token_type_standard: string | number;
    tx_count_slp_token_type_fungible: string | number;
    tx_count_slp_token_type_mint_vault: string | number;
    tx_count_slp_token_type_nft1_group: string | number;
    tx_count_slp_token_type_nft1_child: string | number;
    app_txs_count: string | number;
    tx_count: string | number;
}

interface DailyGenesisTxsRow {
    date: string;
    genesis_alp_standard: string | number;
    genesis_slp_fungible: string | number;
    genesis_slp_mint_vault: string | number;
    genesis_slp_nft1_group: string | number;
    genesis_slp_nft1_child: string | number;
}

interface CumulativeTokensRow {
    date: string;
    cumulative_genesis_alp_standard: string | number;
    cumulative_genesis_slp_fungible: string | number;
    cumulative_genesis_slp_mint_vault: string | number;
    cumulative_genesis_slp_nft1_group: string | number;
    cumulative_genesis_slp_nft1_child: string | number;
}

interface DailyActiveAddressesRow {
    date: string;
    daily_active_senders: string | number;
    daily_active_addresses: string | number;
}

interface DailyFusionRow {
    date: string;
    fusion_tx_count: string | number;
}

interface CumulativeFusionRow {
    date: string;
    cumulative_fusion_txs: string | number;
}

interface DailyAgoraTradersRow {
    date: string;
    agora_unique_traders: string | number;
}

interface DailyLokadTxsRow {
    date: string;
    lokad_tx_count: string | number;
}

interface NewAddressesRow {
    date: string;
    new_addresses_count: string | number;
}

interface CumulativeAddressesRow {
    date: string;
    cumulative_addresses: string | number;
}

interface DailyMinersStakersRow {
    date: string;
    daily_unique_miners: string | number;
    daily_unique_stakers: string | number;
}

interface CumulativeMinersStakersRow {
    date: string;
    cumulative_miners: string | number;
    cumulative_stakers: string | number;
}

interface DailyPriceRow {
    date: string;
    avg_price_usd: string | number;
}

interface DailyAgoraVolumeUSDRow {
    date: string;
    agora_volume_sats: string | number;
    agora_volume_xecx_sats: string | number;
    agora_volume_firma_sats: string | number;
    price_usd: string | number;
}

interface CumulativeAgoraVolumeUSDRow {
    date: string;
    cumulative_agora_volume_usd: string | number;
    cumulative_agora_volume_xecx_usd: string | number;
    cumulative_agora_volume_firma_usd: string | number;
}

interface CountRow {
    count: string | number;
}

interface HeightRow {
    height: string | number;
}

interface DateRangeRow {
    earliest_date?: string;
    latest_date?: string;
}

interface DaysRow {
    date: string;
    total_blocks: string | number;
    total_transactions: string | number;
    avg_block_size: string | number;
    sum_coinbase_output_sats: string | number;
    miner_reward_sats: string | number;
    staking_reward_sats: string | number;
    ifp_reward_sats: string | number;
    agora_volume_sats: string | number;
    agora_volume_xecx_sats: string | number;
    agora_volume_firma_sats: string | number;
    price_usd: string | number;
}

// Database connection pool
let pool: Pool | null = null;

// Initialize database connection
function getPool(): Pool {
    if (!pool) {
        const connectionString = process.env.NEXT_DB_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error(
                'NEXT_DB_CONNECTION_STRING environment variable is not set',
            );
        }

        pool = new Pool({
            connectionString,
            max: 10, // Maximum number of connections in the pool
            idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
            connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
        });

        // Set timezone to UTC for all connections
        pool.on('connect', client => {
            client.query('SET timezone = UTC');
        });

        // Handle pool errors
        pool.on('error', err => {
            console.error('[DB] Unexpected error on idle client', err);
        });
    }
    return pool;
}

// Database service class
export class DatabaseService {
    private pool: Pool;

    constructor() {
        this.pool = getPool();
    }

    // Get daily statistics for charts
    async getDailyStats(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT 
                    to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    total_blocks,
                    total_transactions,
                    avg_block_size
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows as DailyStatsRow[];
        } catch (error) {
            console.error('[DB] Error in getDailyStats:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Get daily coinbase statistics for reward charts
    async getDailyCoinbaseStats(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT 
                    to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    sum_coinbase_output_sats,
                    miner_reward_sats,
                    staking_reward_sats,
                    ifp_reward_sats
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows as DailyCoinbaseStatsRow[];
        } finally {
            client.release();
        }
    }

    // Get daily claims data
    async getDailyClaims(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT DATE(to_timestamp(timestamp)) as date,
                    SUM(cachet_claim_count) as cachet_claims,
                    SUM(cashtab_faucet_claim_count) as cashtab_faucet_claims
                FROM blocks
            `;

            const params: (string | number)[] = [];
            if (startDate && endDate) {
                query +=
                    ' WHERE DATE(to_timestamp(timestamp)) BETWEEN $1 AND $2';
                params.push(startDate, endDate);
            }

            query += ' GROUP BY DATE(to_timestamp(timestamp)) ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyClaimsRow) => ({
                date: row.date,
                cachet_claims: Number(row.cachet_claims),
                cashtab_faucet_claims: Number(row.cashtab_faucet_claims),
            }));
        } finally {
            client.release();
        }
    }

    // Get cumulative claims data
    async getCumulativeClaims(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    cumulative_cachet_claims,
                    cumulative_cashtab_faucet_claims
                FROM cumulative_claims
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: CumulativeClaimsRow) => ({
                date: row.date,
                cumulative_cachet_claims: Number(row.cumulative_cachet_claims),
                cumulative_cashtab_faucet_claims: Number(
                    row.cumulative_cashtab_faucet_claims,
                ),
            }));
        } finally {
            client.release();
        }
    }

    // Get daily binance withdrawals
    async getDailyBinanceWithdrawals(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT DATE(to_timestamp(timestamp)) as date,
                    SUM(binance_withdrawal_count) as withdrawal_count,
                SUM(binance_withdrawal_sats) as withdrawal_sats
                FROM blocks
            `;

            const params: (string | number)[] = [];
            if (startDate && endDate) {
                query +=
                    ' WHERE DATE(to_timestamp(timestamp)) BETWEEN $1 AND $2';
                params.push(startDate, endDate);
            }

            query += ' GROUP BY DATE(to_timestamp(timestamp)) ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyBinanceWithdrawalsRow) => ({
                date: row.date,
                withdrawal_count: Number(row.withdrawal_count),
                withdrawal_sats: Number(row.withdrawal_sats),
            }));
        } finally {
            client.release();
        }
    }

    // Get daily agora volume
    async getDailyAgoraVolume(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    agora_volume_sats,
                    agora_volume_xecx_sats,
                    agora_volume_firma_sats
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyAgoraVolumeRow) => {
                const total = Number(row.agora_volume_sats);
                const xecx = Number(row.agora_volume_xecx_sats);
                const firma = Number(row.agora_volume_firma_sats);
                const other = total - xecx - firma;
                return {
                    date: row.date,
                    xecx,
                    firma,
                    other,
                    total,
                };
            });
        } finally {
            client.release();
        }
    }

    // Get cumulative agora volume
    async getCumulativeAgoraVolume(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    cumulative_agora_volume_sats as cumulative_total,
                    cumulative_agora_volume_xecx_sats as cumulative_xecx,
                    cumulative_agora_volume_firma_sats as cumulative_firma
                FROM cumulative_agora_volume
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: CumulativeAgoraVolumeRow) => {
                const total = Number(row.cumulative_total);
                const xecx = Number(row.cumulative_xecx);
                const firma = Number(row.cumulative_firma);
                const other = total - xecx - firma;
                return {
                    date: row.date,
                    xecx,
                    firma,
                    other,
                    total,
                };
            });
        } finally {
            client.release();
        }
    }

    // Get daily token type transaction counts
    async getDailyTokenTypeTxCounts(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT DATE(to_timestamp(timestamp)) as date,
                    SUM(tx_count_alp_token_type_standard) as tx_count_alp_token_type_standard,
                    SUM(tx_count_slp_token_type_fungible) as tx_count_slp_token_type_fungible,
                    SUM(tx_count_slp_token_type_mint_vault) as tx_count_slp_token_type_mint_vault,
                    SUM(tx_count_slp_token_type_nft1_group) as tx_count_slp_token_type_nft1_group,
                    SUM(tx_count_slp_token_type_nft1_child) as tx_count_slp_token_type_nft1_child,
                    SUM(app_txs_count) as app_txs_count,
                    SUM(tx_count) as tx_count
                FROM blocks
            `;

            const params: (string | number)[] = [];
            if (startDate && endDate) {
                query +=
                    ' WHERE DATE(to_timestamp(timestamp)) BETWEEN $1 AND $2';
                params.push(startDate, endDate);
            }

            query += ' GROUP BY DATE(to_timestamp(timestamp)) ORDER BY date';

            const result = await client.query(query, params);

            return result.rows.map((row: DailyTokenTypeRow) => ({
                date: row.date,
                tx_count_alp_token_type_standard: Number(
                    row.tx_count_alp_token_type_standard,
                ),
                tx_count_slp_token_type_fungible: Number(
                    row.tx_count_slp_token_type_fungible,
                ),
                tx_count_slp_token_type_mint_vault: Number(
                    row.tx_count_slp_token_type_mint_vault,
                ),
                tx_count_slp_token_type_nft1_group: Number(
                    row.tx_count_slp_token_type_nft1_group,
                ),
                tx_count_slp_token_type_nft1_child: Number(
                    row.tx_count_slp_token_type_nft1_child,
                ),
                app_txs_count: Number(row.app_txs_count),
                non_token_txs: Number(row.tx_count) - Number(row.app_txs_count),
            }));
        } finally {
            client.release();
        }
    }

    // Get daily genesis transactions
    async getDailyGenesisTxs(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT DATE(to_timestamp(timestamp)) as date,
                    SUM(tx_count_genesis_alp_token_type_standard) as genesis_alp_standard,
                    SUM(tx_count_genesis_slp_token_type_fungible) as genesis_slp_fungible,
                    SUM(tx_count_genesis_slp_token_type_mint_vault) as genesis_slp_mint_vault,
                    SUM(tx_count_genesis_slp_token_type_nft1_group) as genesis_slp_nft1_group,
                    SUM(tx_count_genesis_slp_token_type_nft1_child) as genesis_slp_nft1_child
                FROM blocks
            `;

            const params: (string | number)[] = [];
            if (startDate && endDate) {
                query +=
                    ' WHERE DATE(to_timestamp(timestamp)) BETWEEN $1 AND $2';
                params.push(startDate, endDate);
            }

            query += ' GROUP BY DATE(to_timestamp(timestamp)) ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyGenesisTxsRow) => ({
                date: row.date,
                genesis_alp_standard: Number(row.genesis_alp_standard),
                genesis_slp_fungible: Number(row.genesis_slp_fungible),
                genesis_slp_mint_vault: Number(row.genesis_slp_mint_vault),
                genesis_slp_nft1_group: Number(row.genesis_slp_nft1_group),
                genesis_slp_nft1_child: Number(row.genesis_slp_nft1_child),
            }));
        } finally {
            client.release();
        }
    }

    // Get cumulative tokens created
    async getCumulativeTokensCreated(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT date,
                    cumulative_genesis_alp_standard,
                    cumulative_genesis_slp_fungible,
                    cumulative_genesis_slp_mint_vault,
                    cumulative_genesis_slp_nft1_group,
                    cumulative_genesis_slp_nft1_child
                FROM cumulative_tokens_created
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: CumulativeTokensRow) => ({
                date: row.date,
                cumulative_alp_standard: Number(
                    row.cumulative_genesis_alp_standard,
                ),
                cumulative_slp_fungible: Number(
                    row.cumulative_genesis_slp_fungible,
                ),
                cumulative_slp_mint_vault: Number(
                    row.cumulative_genesis_slp_mint_vault,
                ),
                cumulative_slp_nft1_group: Number(
                    row.cumulative_genesis_slp_nft1_group,
                ),
                cumulative_slp_nft1_child: Number(
                    row.cumulative_genesis_slp_nft1_child,
                ),
            }));
        } finally {
            client.release();
        }
    }

    // Get daily price data
    async getDailyPrice(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT 
                    to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    price_usd as avg_price_usd
                FROM days
                WHERE price_usd IS NOT NULL
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);

            return result.rows.map((row: DailyPriceRow) => ({
                date: row.date,
                avg_price_usd: Number(row.avg_price_usd),
            }));
        } finally {
            client.release();
        }
    }

    // Get daily agora volume in USD
    async getDailyAgoraVolumeUSD(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT date,
                    agora_volume_sats,
                    agora_volume_xecx_sats,
                    agora_volume_firma_sats,
                    price_usd
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyAgoraVolumeUSDRow) => {
                const totalSats = Number(row.agora_volume_sats);
                const xecxSats = Number(row.agora_volume_xecx_sats);
                const firmaSats = Number(row.agora_volume_firma_sats);
                const price = Number(row.price_usd) || 0;

                // Convert sats to USD (1 XEC = 100 sats)
                const totalUSD = (totalSats / 100) * price;
                const xecxUSD = (xecxSats / 100) * price;
                const firmaUSD = (firmaSats / 100) * price;
                const otherUSD = totalUSD - xecxUSD - firmaUSD;

                return {
                    date: row.date,
                    usd: totalUSD,
                    xecx_usd: xecxUSD,
                    firma_usd: firmaUSD,
                    other_usd: otherUSD,
                };
            });
        } finally {
            client.release();
        }
    }

    // Get cumulative agora volume in USD
    async getCumulativeAgoraVolumeUSD(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT 
                    to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    cumulative_agora_volume_usd,
                    cumulative_agora_volume_xecx_usd,
                    cumulative_agora_volume_firma_usd
                FROM cumulative_agora_volume
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);

            return result.rows.map((row: CumulativeAgoraVolumeUSDRow) => {
                // cumulative_agora_volume_usd is the cumulative total of ALL agora volume
                // cumulative_agora_volume_xecx_usd is cumulative xecx
                // cumulative_agora_volume_firma_usd is cumulative firma
                const totalUSD = Number(row.cumulative_agora_volume_usd) || 0;
                const xecxUSD =
                    Number(row.cumulative_agora_volume_xecx_usd) || 0;
                const firmaUSD =
                    Number(row.cumulative_agora_volume_firma_usd) || 0;
                const otherUSD = totalUSD - xecxUSD - firmaUSD;

                return {
                    date: row.date,
                    usd: totalUSD,
                    xecx_usd: xecxUSD,
                    firma_usd: firmaUSD,
                    other_usd: otherUSD,
                };
            });
        } finally {
            client.release();
        }
    }

    // Get daily active addresses (unique senders)
    async getDailyActiveAddresses(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    daily_active_senders,
                    daily_active_addresses
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = ['daily_active_addresses > 0'];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyActiveAddressesRow) => ({
                date: row.date,
                daily_active_senders: Number(row.daily_active_senders),
                daily_active_addresses: Number(row.daily_active_addresses),
            }));
        } finally {
            client.release();
        }
    }

    // Get daily CashFusion transactions
    async getDailyFusion(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    fusion_tx_count
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = ['fusion_tx_count > 0'];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyFusionRow) => ({
                date: row.date,
                fusion_tx_count: Number(row.fusion_tx_count),
            }));
        } finally {
            client.release();
        }
    }

    // Get cumulative CashFusion transactions
    async getCumulativeFusion(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    cumulative_fusion_txs
                FROM cumulative_fusion
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            // Filter out incomplete days (current day)
            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: CumulativeFusionRow) => ({
                date: row.date,
                cumulative_fusion_txs: Number(row.cumulative_fusion_txs),
            }));
        } finally {
            client.release();
        }
    }

    // Get daily unique Agora traders (true deduplicated count)
    async getDailyAgoraTraders(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    daily_agora_unique_traders as agora_unique_traders
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyAgoraTradersRow) => ({
                date: row.date,
                agora_unique_traders: Number(row.agora_unique_traders),
            }));
        } finally {
            client.release();
        }
    }

    // Get daily LOKAD protocol transactions
    async getDailyLokadTxs(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    lokad_tx_count
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = ['lokad_tx_count > 0'];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyLokadTxsRow) => ({
                date: row.date,
                lokad_tx_count: Number(row.lokad_tx_count),
            }));
        } finally {
            client.release();
        }
    }

    // Get summary statistics
    async getSummary() {
        const client = await this.pool.connect();
        try {
            const blockCountResult = await client.query(
                'SELECT COUNT(*) as count FROM blocks',
            );
            const latestHeightResult = await client.query(
                'SELECT MAX(height) as height FROM blocks',
            );
            const lowestHeightResult = await client.query(
                'SELECT MIN(height) as height FROM blocks',
            );
            const recentStatsResult = await client.query(
                'SELECT * FROM days ORDER BY date DESC LIMIT 7',
            );

            // Get actual date range in the database
            const dateRangeResult = await client.query(
                'SELECT MIN(date) as earliest_date, MAX(date) as latest_date FROM days',
            );

            return {
                totalBlocks: parseInt(
                    String((blockCountResult.rows[0] as CountRow).count),
                ),
                latestBlockHeight:
                    parseInt(
                        String(
                            (latestHeightResult.rows[0] as HeightRow).height,
                        ),
                    ) || 0,
                lowestBlockHeight:
                    parseInt(
                        String(
                            (lowestHeightResult.rows[0] as HeightRow).height,
                        ),
                    ) || 0,
                latestDayStats: (recentStatsResult.rows[0] as DaysRow) || null,
                recentStats: recentStatsResult.rows as DaysRow[],
                dataRange: {
                    earliestDate: (dateRangeResult.rows[0] as DateRangeRow)
                        ?.earliest_date,
                    latestDate: (dateRangeResult.rows[0] as DateRangeRow)
                        ?.latest_date,
                },
            };
        } finally {
            client.release();
        }
    }

    // Test database connection
    async testConnection() {
        const client = await this.pool.connect();
        try {
            const result = await client.query(
                'SELECT COUNT(*) as count FROM blocks LIMIT 1',
            );
            return { success: true, blockCount: result.rows[0].count };
        } finally {
            client.release();
        }
    }

    // Get new addresses per day
    async getNewAddressesPerDay(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    new_addresses_count
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = ['new_addresses_count > 0'];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: NewAddressesRow) => ({
                date: row.date,
                new_addresses_count: Number(row.new_addresses_count),
            }));
        } finally {
            client.release();
        }
    }

    // Get cumulative addresses over time
    async getCumulativeAddresses(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    cumulative_addresses
                FROM cumulative_addresses
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = ['cumulative_addresses > 0'];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: CumulativeAddressesRow) => ({
                date: row.date,
                cumulative_addresses: Number(row.cumulative_addresses),
            }));
        } finally {
            client.release();
        }
    }

    // Get daily unique miners and stakers
    async getDailyMinersStakers(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    daily_unique_miners,
                    daily_unique_stakers
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: DailyMinersStakersRow) => ({
                date: row.date,
                daily_unique_miners: Number(row.daily_unique_miners),
                daily_unique_stakers: Number(row.daily_unique_stakers),
            }));
        } finally {
            client.release();
        }
    }

    // Get cumulative miner/staker/both counts
    async getCumulativeMinersStakers(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    cumulative_miners, cumulative_stakers
                FROM cumulative_miners_stakers
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map((row: CumulativeMinersStakersRow) => ({
                date: row.date,
                cumulative_miners: Number(row.cumulative_miners),
                cumulative_stakers: Number(row.cumulative_stakers),
            }));
        } finally {
            client.release();
        }
    }

    async getReturningVsNewAddresses(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    GREATEST(daily_active_addresses - new_addresses_count, 0) as returning_addresses,
                    new_addresses_count as new_addresses
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = ['daily_active_addresses > 0'];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map(
                (row: {
                    date: string;
                    returning_addresses: string | number;
                    new_addresses: string | number;
                }) => ({
                    date: row.date,
                    returning_addresses: Number(row.returning_addresses),
                    new_addresses: Number(row.new_addresses),
                }),
            );
        } finally {
            client.release();
        }
    }

    async getDailyCoinbaseRecipients(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    daily_coinbase_recipients
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = ['daily_coinbase_recipients > 0'];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map(
                (row: {
                    date: string;
                    daily_coinbase_recipients: string | number;
                }) => ({
                    date: row.date,
                    daily_coinbase_recipients: Number(
                        row.daily_coinbase_recipients,
                    ),
                }),
            );
        } finally {
            client.release();
        }
    }

    async getNewMinersStakers(startDate?: string, endDate?: string) {
        const client = await this.pool.connect();
        try {
            let query = `
                SELECT to_char(date AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as date,
                    new_miners_count, new_stakers_count
                FROM days
            `;

            const params: (string | number)[] = [];
            const conditions: string[] = [
                '(new_miners_count > 0 OR new_stakers_count > 0)',
            ];

            if (startDate && endDate) {
                conditions.push('date BETWEEN $1 AND $2');
                params.push(startDate, endDate);
            }

            const today = new Date().toISOString().split('T')[0];
            conditions.push('date < $' + (params.length + 1));
            params.push(today);

            query += ' WHERE ' + conditions.join(' AND ');
            query += ' ORDER BY date';

            const result = await client.query(query, params);
            return result.rows.map(
                (row: {
                    date: string;
                    new_miners_count: string | number;
                    new_stakers_count: string | number;
                }) => ({
                    date: row.date,
                    new_miners_count: Number(row.new_miners_count),
                    new_stakers_count: Number(row.new_stakers_count),
                }),
            );
        } finally {
            client.release();
        }
    }

    /**
     * Top addresses by XEC balance (incremental balance_sats column).
     */
    async getRichList(limit = 100, minBalanceSats = 10000) {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT output_script, balance_sats,
                       is_miner, is_staker, is_coinbase_recipient, first_seen
                FROM addresses
                WHERE balance_sats >= $1
                ORDER BY balance_sats DESC
                LIMIT $2
            `;
            const result = await client.query(query, [minBalanceSats, limit]);
            return result.rows.map(
                (row: {
                    output_script: string;
                    balance_sats: string | number;
                    is_miner: boolean;
                    is_staker: boolean;
                    is_coinbase_recipient: boolean;
                    first_seen: string;
                }) => ({
                    output_script: row.output_script,
                    balance_sats: Number(row.balance_sats),
                    is_miner: row.is_miner,
                    is_staker: row.is_staker,
                    is_coinbase_recipient: row.is_coinbase_recipient,
                    first_seen: row.first_seen,
                }),
            );
        } finally {
            client.release();
        }
    }

    /**
     * Top holders for a token by atom balance (fungible rich list).
     *
     * Mint batons always have atoms = 0. Default minAtoms (>= 1) therefore
     * excludes batons; pass includeMintBatons=true and min_atoms=0 if baton
     * rows are needed (API: include_mint_batons + min_atoms).
     */
    async getTokenRichList(
        tokenId: string,
        limit = 100,
        minAtoms = 1n,
        includeMintBatons = false,
    ) {
        const client = await this.pool.connect();
        try {
            const query = `
                SELECT output_script, atoms::text, is_mint_baton,
                       token_protocol, token_type
                FROM token_balances
                WHERE token_id = $1
                  AND atoms >= $2
                  AND ($3::boolean OR is_mint_baton = FALSE)
                ORDER BY atoms DESC
                LIMIT $4
            `;
            const result = await client.query(query, [
                tokenId,
                minAtoms.toString(),
                includeMintBatons,
                limit,
            ]);
            return result.rows.map(
                (row: {
                    output_script: string;
                    atoms: string;
                    is_mint_baton: boolean;
                    token_protocol: string;
                    token_type: string;
                }) => ({
                    output_script: row.output_script,
                    atoms: row.atoms,
                    is_mint_baton: row.is_mint_baton,
                    token_protocol: row.token_protocol,
                    token_type: row.token_type,
                }),
            );
        } finally {
            client.release();
        }
    }

    /**
     * Tokens seen by the indexer (from on-chain activity).
     */
    async getIndexedTokens(limit = 100, protocol?: string) {
        const client = await this.pool.connect();
        try {
            const query = protocol
                ? `SELECT token_id, token_protocol, token_type, first_seen_height
                   FROM tokens
                   WHERE token_protocol = $2
                   ORDER BY first_seen_height DESC
                   LIMIT $1`
                : `SELECT token_id, token_protocol, token_type, first_seen_height
                   FROM tokens
                   ORDER BY first_seen_height DESC
                   LIMIT $1`;
            const params = protocol ? [limit, protocol] : [limit];
            const result = await client.query(query, params);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // Close the database pool
    async close() {
        if (pool) {
            await pool.end();
            pool = null;
        }
    }
}

// Export a singleton instance
export const db = new DatabaseService();
