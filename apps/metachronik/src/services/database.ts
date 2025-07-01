// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import DatabaseConnection from '../database/connection';
import { DatabaseConfig } from '../types';
import logger from '../utils/logger';

export interface Block {
    height: number;
    hash: string;
    timestamp: number;
    tx_count: number;
    tx_count_alp_token_type_standard: number;
    tx_count_slp_token_type_fungible: number;
    tx_count_slp_token_type_mint_vault: number;
    tx_count_slp_token_type_nft1_group: number;
    tx_count_slp_token_type_nft1_child: number;
    tx_count_genesis_alp_token_type_standard: number;
    tx_count_genesis_slp_token_type_fungible: number;
    tx_count_genesis_slp_token_type_mint_vault: number;
    tx_count_genesis_slp_token_type_nft1_group: number;
    tx_count_genesis_slp_token_type_nft1_child: number;
    block_size: number;
    sum_coinbase_output_sats: bigint;
    miner_reward_sats: bigint;
    staking_reward_sats: bigint;
    ifp_reward_sats: bigint;
    cachet_claim_count: number;
    cashtab_faucet_claim_count: number;
    binance_withdrawal_count: number;
    binance_withdrawal_sats: bigint;
    agora_volume_sats: bigint;
    agora_volume_xecx_sats: bigint;
    agora_volume_firma_sats: bigint;
    app_txs_count: number;
}

export interface DailyStats {
    date: string;
    total_blocks: number;
    total_transactions: number;
    avg_block_size: number;
}

export interface DailyCoinbaseStats {
    date: string;
    sum_coinbase_output_sats: bigint;
    miner_reward_sats: bigint;
    staking_reward_sats: bigint;
    ifp_reward_sats: bigint;
}

class DatabaseService {
    private db: DatabaseConnection;

    constructor(config: DatabaseConfig) {
        this.db = DatabaseConnection.getInstance(config);
    }

    async saveBlock(block: Block): Promise<void> {
        try {
            await this.db.query(
                'INSERT INTO blocks (height, hash, timestamp, tx_count, tx_count_alp_token_type_standard, tx_count_slp_token_type_fungible, tx_count_slp_token_type_mint_vault, tx_count_slp_token_type_nft1_group, tx_count_slp_token_type_nft1_child, tx_count_genesis_alp_token_type_standard, tx_count_genesis_slp_token_type_fungible, tx_count_genesis_slp_token_type_mint_vault, tx_count_genesis_slp_token_type_nft1_group, tx_count_genesis_slp_token_type_nft1_child, block_size, sum_coinbase_output_sats, miner_reward_sats, staking_reward_sats, ifp_reward_sats, cachet_claim_count, cashtab_faucet_claim_count, binance_withdrawal_count, binance_withdrawal_sats, agora_volume_sats, agora_volume_xecx_sats, agora_volume_firma_sats, app_txs_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) ON CONFLICT (height) DO NOTHING',
                [
                    block.height,
                    block.hash,
                    block.timestamp,
                    block.tx_count,
                    block.tx_count_alp_token_type_standard,
                    block.tx_count_slp_token_type_fungible,
                    block.tx_count_slp_token_type_mint_vault,
                    block.tx_count_slp_token_type_nft1_group,
                    block.tx_count_slp_token_type_nft1_child,
                    block.tx_count_genesis_alp_token_type_standard,
                    block.tx_count_genesis_slp_token_type_fungible,
                    block.tx_count_genesis_slp_token_type_mint_vault,
                    block.tx_count_genesis_slp_token_type_nft1_group,
                    block.tx_count_genesis_slp_token_type_nft1_child,
                    block.block_size,
                    block.sum_coinbase_output_sats,
                    block.miner_reward_sats,
                    block.staking_reward_sats,
                    block.ifp_reward_sats,
                    block.cachet_claim_count,
                    block.cashtab_faucet_claim_count,
                    block.binance_withdrawal_count,
                    block.binance_withdrawal_sats,
                    block.agora_volume_sats,
                    block.agora_volume_xecx_sats,
                    block.agora_volume_firma_sats,
                    block.app_txs_count,
                ],
            );
        } catch (error) {
            logger.error('Error saving block:', error);
            throw error;
        }
    }

    /**
     * Save multiple blocks in a transaction
     */
    async saveBlocks(blocks: Block[]): Promise<void> {
        try {
            await this.db.transaction(async (client: any) => {
                for (const block of blocks) {
                    await client.query(
                        'INSERT INTO blocks (height, hash, timestamp, tx_count, tx_count_alp_token_type_standard, tx_count_slp_token_type_fungible, tx_count_slp_token_type_mint_vault, tx_count_slp_token_type_nft1_group, tx_count_slp_token_type_nft1_child, tx_count_genesis_alp_token_type_standard, tx_count_genesis_slp_token_type_fungible, tx_count_genesis_slp_token_type_mint_vault, tx_count_genesis_slp_token_type_nft1_group, tx_count_genesis_slp_token_type_nft1_child, block_size, sum_coinbase_output_sats, miner_reward_sats, staking_reward_sats, ifp_reward_sats, cachet_claim_count, cashtab_faucet_claim_count, binance_withdrawal_count, binance_withdrawal_sats, agora_volume_sats, agora_volume_xecx_sats, agora_volume_firma_sats, app_txs_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) ON CONFLICT (height) DO NOTHING',
                        [
                            block.height,
                            block.hash,
                            block.timestamp,
                            block.tx_count,
                            block.tx_count_alp_token_type_standard,
                            block.tx_count_slp_token_type_fungible,
                            block.tx_count_slp_token_type_mint_vault,
                            block.tx_count_slp_token_type_nft1_group,
                            block.tx_count_slp_token_type_nft1_child,
                            block.tx_count_genesis_alp_token_type_standard,
                            block.tx_count_genesis_slp_token_type_fungible,
                            block.tx_count_genesis_slp_token_type_mint_vault,
                            block.tx_count_genesis_slp_token_type_nft1_group,
                            block.tx_count_genesis_slp_token_type_nft1_child,
                            block.block_size,
                            block.sum_coinbase_output_sats,
                            block.miner_reward_sats,
                            block.staking_reward_sats,
                            block.ifp_reward_sats,
                            block.cachet_claim_count,
                            block.cashtab_faucet_claim_count,
                            block.binance_withdrawal_count,
                            block.binance_withdrawal_sats,
                            block.agora_volume_sats,
                            block.agora_volume_xecx_sats,
                            block.agora_volume_firma_sats,
                            block.app_txs_count,
                        ],
                    );
                }
            });
        } catch (error) {
            logger.error('Error saving blocks:', error);
            throw error;
        }
    }

    /**
     * Get the highest block height in the database
     */
    async getHighestBlockHeight(): Promise<number> {
        try {
            const result = await this.db.query(
                'SELECT MAX(height) as max_height FROM blocks',
            );
            return result.rows[0]?.max_height || 0;
        } catch (error) {
            logger.error('Error getting highest block height:', error);
            throw error;
        }
    }

    /**
     * Get the lowest block height in the database
     */
    async getLowestBlockHeight(): Promise<number> {
        try {
            const result = await this.db.query(
                'SELECT MIN(height) as min_height FROM blocks',
            );
            return result.rows[0]?.min_height || 0;
        } catch (error) {
            logger.error('Error getting lowest block height:', error);
            throw error;
        }
    }

    /**
     * Get daily statistics for charts (from days table)
     */
    async getDailyStats(
        startDate?: string,
        endDate?: string,
    ): Promise<DailyStats[]> {
        try {
            let query = `
                SELECT 
                    date,
                    total_blocks,
                    total_transactions,
                    avg_block_size
                FROM days
            `;

            const params: any[] = [];
            if (startDate && endDate) {
                query += ' WHERE date BETWEEN $1 AND $2';
                params.push(startDate, endDate);
            }

            query += ' ORDER BY date';

            const result = await this.db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Error getting daily stats:', error);
            throw error;
        }
    }

    /**
     * Get daily coinbase statistics for reward charts (from days table)
     */
    async getDailyCoinbaseStats(
        startDate?: string,
        endDate?: string,
    ): Promise<DailyCoinbaseStats[]> {
        try {
            let query = `
                SELECT 
                    date,
                    sum_coinbase_output_sats,
                    miner_reward_sats,
                    staking_reward_sats,
                    ifp_reward_sats
                FROM days
            `;

            const params: any[] = [];
            if (startDate && endDate) {
                query += ' WHERE date BETWEEN $1 AND $2';
                params.push(startDate, endDate);
            }

            query += ' ORDER BY date';

            const result = await this.db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Error getting daily coinbase stats:', error);
            throw error;
        }
    }

    /**
     * Get blocks within a height range
     */
    async getBlocksInRange(
        startHeight: number,
        endHeight: number,
    ): Promise<Block[]> {
        try {
            const result = await this.db.query(
                'SELECT height, hash, timestamp, tx_count, tx_count_alp_token_type_standard, tx_count_slp_token_type_fungible, tx_count_slp_token_type_mint_vault, tx_count_slp_token_type_nft1_group, tx_count_slp_token_type_nft1_child, tx_count_genesis_alp_token_type_standard, tx_count_genesis_slp_token_type_fungible, tx_count_genesis_slp_token_type_mint_vault, tx_count_genesis_slp_token_type_nft1_group, tx_count_genesis_slp_token_type_nft1_child, block_size, sum_coinbase_output_sats, miner_reward_sats, staking_reward_sats, ifp_reward_sats, cachet_claim_count, cashtab_faucet_claim_count, binance_withdrawal_count, binance_withdrawal_sats, agora_volume_sats, agora_volume_xecx_sats, agora_volume_firma_sats, app_txs_count FROM blocks WHERE height BETWEEN $1 AND $2 ORDER BY height',
                [startHeight, endHeight],
            );
            return result.rows;
        } catch (error) {
            logger.error('Error getting blocks in range:', error);
            throw error;
        }
    }

    /**
     * Check if a block exists
     */
    async blockExists(height: number): Promise<boolean> {
        try {
            const result = await this.db.query(
                'SELECT 1 FROM blocks WHERE height = $1',
                [height],
            );
            return result.rows.length > 0;
        } catch (error) {
            logger.error('Error checking if block exists:', error);
            throw error;
        }
    }

    /**
     * Initialize database tables
     */
    async initializeTables(): Promise<void> {
        try {
            const fs = require('fs');
            const path = require('path');
            const schemaPath = path.join(__dirname, '../database/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');

            await this.db.query(schema);
            logger.info('Database tables initialized successfully');
        } catch (error) {
            logger.error('Error initializing database tables:', error);
            throw error;
        }
    }

    /**
     * Recreate only the blocks table (for reindexing)
     */
    async recreateBlocksTable(): Promise<void> {
        try {
            const fs = require('fs');
            const path = require('path');
            const schemaPath = path.join(__dirname, '../database/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');

            // Extract only the blocks table creation part
            const blocksTableMatch = schema.match(
                /CREATE TABLE IF NOT EXISTS blocks[\s\S]*?;/,
            );
            if (!blocksTableMatch) {
                throw new Error(
                    'Could not find blocks table creation in schema',
                );
            }

            const blocksTableSchema = blocksTableMatch[0];
            await this.db.query(blocksTableSchema);
            logger.info('Blocks table recreated successfully');
        } catch (error) {
            logger.error('Error recreating blocks table:', error);
            throw error;
        }
    }

    /**
     * Recreate only the days table (for reindexing)
     */
    async recreateDaysTable(): Promise<void> {
        try {
            const fs = require('fs');
            const path = require('path');
            const schemaPath = path.join(__dirname, '../database/schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');

            // Extract only the days table creation part
            const daysTableMatch = schema.match(
                /CREATE TABLE IF NOT EXISTS days[\s\S]*?;/,
            );
            if (!daysTableMatch) {
                throw new Error('Could not find days table creation in schema');
            }

            const daysTableSchema = daysTableMatch[0];
            await this.db.query(daysTableSchema);
            logger.info('Days table recreated successfully');
        } catch (error) {
            logger.error('Error recreating days table:', error);
            throw error;
        }
    }

    /**
     * Aggregate blocks into daily data
     */
    async aggregateDailyData(
        date: string,
        chronikService?: any,
    ): Promise<void> {
        try {
            // Check if this day already exists
            const existingDay = await this.getDayByDate(date);
            const isNewDay = !existingDay;
            let currentPrice: number | null = null;

            if (isNewDay && chronikService) {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];

                if (todayStr && date >= todayStr) {
                    // Only fetch price for today
                    try {
                        currentPrice =
                            await chronikService.getCurrentXECPrice();
                        if (currentPrice !== null) {
                            logger.info(
                                `Fetched current price for new day ${date}: $${currentPrice}`,
                            );
                        }
                    } catch (error) {
                        logger.warn(
                            `Failed to fetch price for new day ${date}:`,
                            error,
                        );
                    }
                } else {
                    // Past days get null price
                    logger.info(`Setting price to NULL for past day ${date}`);
                }
            }

            const query = `
                INSERT INTO days (
                    date, total_blocks, total_transactions, avg_block_size,
                    sum_coinbase_output_sats, miner_reward_sats, staking_reward_sats, ifp_reward_sats,
                    cachet_claim_count, cashtab_faucet_claim_count,
                    binance_withdrawal_count, binance_withdrawal_sats, agora_volume_sats, agora_volume_xecx_sats, agora_volume_firma_sats, app_txs_count,
                    tx_count_alp_token_type_standard, tx_count_slp_token_type_fungible,
                    tx_count_slp_token_type_mint_vault, tx_count_slp_token_type_nft1_group,
                    tx_count_slp_token_type_nft1_child,
                    tx_count_genesis_alp_token_type_standard, tx_count_genesis_slp_token_type_fungible,
                    tx_count_genesis_slp_token_type_mint_vault, tx_count_genesis_slp_token_type_nft1_group,
                    tx_count_genesis_slp_token_type_nft1_child, price_usd
                )
                SELECT 
                    DATE(to_timestamp(timestamp)) as date,
                    COUNT(*) as total_blocks,
                    SUM(tx_count) as total_transactions,
                    AVG(block_size) as avg_block_size,
                    SUM(sum_coinbase_output_sats) as sum_coinbase_output_sats,
                    SUM(miner_reward_sats) as miner_reward_sats,
                    SUM(staking_reward_sats) as staking_reward_sats,
                    SUM(ifp_reward_sats) as ifp_reward_sats,
                    SUM(cachet_claim_count) as cachet_claim_count,
                    SUM(cashtab_faucet_claim_count) as cashtab_faucet_claim_count,
                    SUM(binance_withdrawal_count) as binance_withdrawal_count,
                    SUM(binance_withdrawal_sats) as binance_withdrawal_sats,
                    SUM(agora_volume_sats) as agora_volume_sats,
                    SUM(agora_volume_xecx_sats) as agora_volume_xecx_sats,
                    SUM(agora_volume_firma_sats) as agora_volume_firma_sats,
                    SUM(app_txs_count) as app_txs_count,
                    SUM(tx_count_alp_token_type_standard) as tx_count_alp_token_type_standard,
                    SUM(tx_count_slp_token_type_fungible) as tx_count_slp_token_type_fungible,
                    SUM(tx_count_slp_token_type_mint_vault) as tx_count_slp_token_type_mint_vault,
                    SUM(tx_count_slp_token_type_nft1_group) as tx_count_slp_token_type_nft1_group,
                    SUM(tx_count_slp_token_type_nft1_child) as tx_count_slp_token_type_nft1_child,
                    SUM(tx_count_genesis_alp_token_type_standard) as tx_count_genesis_alp_token_type_standard,
                    SUM(tx_count_genesis_slp_token_type_fungible) as tx_count_genesis_slp_token_type_fungible,
                    SUM(tx_count_genesis_slp_token_type_mint_vault) as tx_count_genesis_slp_token_type_mint_vault,
                    SUM(tx_count_genesis_slp_token_type_nft1_group) as tx_count_genesis_slp_token_type_nft1_group,
                    SUM(tx_count_genesis_slp_token_type_nft1_child) as tx_count_genesis_slp_token_type_nft1_child,
                    $2 as price_usd
                FROM blocks 
                WHERE DATE(to_timestamp(timestamp)) = $1
                GROUP BY DATE(to_timestamp(timestamp))
                ON CONFLICT (date) DO UPDATE SET
                    total_blocks = EXCLUDED.total_blocks,
                    total_transactions = EXCLUDED.total_transactions,
                    avg_block_size = EXCLUDED.avg_block_size,
                    sum_coinbase_output_sats = EXCLUDED.sum_coinbase_output_sats,
                    miner_reward_sats = EXCLUDED.miner_reward_sats,
                    staking_reward_sats = EXCLUDED.staking_reward_sats,
                    ifp_reward_sats = EXCLUDED.ifp_reward_sats,
                    cachet_claim_count = EXCLUDED.cachet_claim_count,
                    cashtab_faucet_claim_count = EXCLUDED.cashtab_faucet_claim_count,
                    binance_withdrawal_count = EXCLUDED.binance_withdrawal_count,
                    binance_withdrawal_sats = EXCLUDED.binance_withdrawal_sats,
                    agora_volume_sats = EXCLUDED.agora_volume_sats,
                    agora_volume_xecx_sats = EXCLUDED.agora_volume_xecx_sats,
                    agora_volume_firma_sats = EXCLUDED.agora_volume_firma_sats,
                    app_txs_count = EXCLUDED.app_txs_count,
                    tx_count_alp_token_type_standard = EXCLUDED.tx_count_alp_token_type_standard,
                    tx_count_slp_token_type_fungible = EXCLUDED.tx_count_slp_token_type_fungible,
                    tx_count_slp_token_type_mint_vault = EXCLUDED.tx_count_slp_token_type_mint_vault,
                    tx_count_slp_token_type_nft1_group = EXCLUDED.tx_count_slp_token_type_nft1_group,
                    tx_count_slp_token_type_nft1_child = EXCLUDED.tx_count_slp_token_type_nft1_child,
                    tx_count_genesis_alp_token_type_standard = EXCLUDED.tx_count_genesis_alp_token_type_standard,
                    tx_count_genesis_slp_token_type_fungible = EXCLUDED.tx_count_genesis_slp_token_type_fungible,
                    tx_count_genesis_slp_token_type_mint_vault = EXCLUDED.tx_count_genesis_slp_token_type_mint_vault,
                    tx_count_genesis_slp_token_type_nft1_group = EXCLUDED.tx_count_genesis_slp_token_type_nft1_group,
                    tx_count_genesis_slp_token_type_nft1_child = EXCLUDED.tx_count_genesis_slp_token_type_nft1_child
                    -- price_usd is NOT updated on conflict
            `;

            await this.db.query(query, [date, currentPrice]);

            if (isNewDay) {
                logger.info(
                    `Created new day ${date} with price: $${currentPrice}`,
                );
            } else {
                logger.info(`Updated existing day ${date}`);
            }
        } catch (error) {
            logger.error(`Error aggregating daily data for ${date}:`, error);
            throw error;
        }
    }

    /**
     * Get block by height
     */
    async getBlockByHeight(height: number): Promise<Block | null> {
        try {
            const result = await this.db.query(
                'SELECT * FROM blocks WHERE height = $1',
                [height],
            );
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            logger.error(`Error getting block by height ${height}:`, error);
            throw error;
        }
    }

    /**
     * Get day by date
     */
    async getDayByDate(date: string): Promise<any | null> {
        try {
            const result = await this.db.query(
                'SELECT * FROM days WHERE date = $1',
                [date],
            );
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            logger.error(`Error getting day by date ${date}:`, error);
            throw error;
        }
    }

    /**
     * Check for missing blocks in a range
     */
    async getMissingBlocks(
        startHeight: number,
        endHeight: number,
    ): Promise<number[]> {
        try {
            // Process in smaller chunks to avoid Neon limits
            const chunkSize = 10000; // Process 10k blocks at a time
            const missingBlocks: number[] = [];

            for (
                let chunkStart = startHeight;
                chunkStart <= endHeight;
                chunkStart += chunkSize
            ) {
                const chunkEnd = Math.min(
                    chunkStart + chunkSize - 1,
                    endHeight,
                );

                try {
                    const result = await this.db.query(
                        `SELECT generate_series($1::integer, $2::integer) AS height
                         EXCEPT
                         SELECT height FROM blocks WHERE height BETWEEN $1 AND $2
                         ORDER BY height`,
                        [chunkStart, chunkEnd],
                    );

                    const chunkMissingBlocks = result.rows.map(
                        (row: any) => row.height,
                    );
                    missingBlocks.push(...chunkMissingBlocks);

                    logger.debug(
                        `Checked chunk ${chunkStart}-${chunkEnd}, found ${chunkMissingBlocks.length} missing blocks`,
                    );
                } catch (chunkError) {
                    logger.error(
                        `Error checking chunk ${chunkStart}-${chunkEnd}:`,
                        chunkError,
                    );
                    // Continue with next chunk instead of failing completely
                }
            }

            return missingBlocks;
        } catch (error) {
            logger.error(
                `Error getting missing blocks between ${startHeight} and ${endHeight}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * Execute a raw query (for internal use)
     */
    async query(sql: string, params?: any[]): Promise<any> {
        return this.db.query(sql, params);
    }

    /**
     * Check if the days table exists
     */
    async daysTableExists(): Promise<boolean> {
        try {
            const result = await this.db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'days'
                );
            `);
            return result.rows[0].exists;
        } catch (error) {
            logger.error('Error checking if days table exists:', error);
            return false;
        }
    }

    /**
     * Get the count of days in the days table
     */
    async getDaysCount(): Promise<number> {
        try {
            const result = await this.db.query(
                'SELECT COUNT(*) as count FROM days',
            );
            return parseInt(result.rows[0].count);
        } catch (error) {
            logger.error('Error getting days count:', error);
            return 0;
        }
    }

    /**
     * Refresh cumulative materialized views
     */
    async refreshCumulativeViews(): Promise<void> {
        try {
            await this.db.query('SELECT refresh_cumulative_views()');
            logger.info('Cumulative materialized views refreshed successfully');
        } catch (error) {
            logger.error(
                'Error refreshing cumulative materialized views:',
                error,
            );
            throw error;
        }
    }
}

export default DatabaseService;
