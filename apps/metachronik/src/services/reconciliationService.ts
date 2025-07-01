// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import DatabaseService from './database';
import ChronikService from './chronik';
import logger from '../utils/logger';

export class ReconciliationService {
    private dbService: DatabaseService;
    private chronikService: ChronikService;

    constructor(dbService: DatabaseService, chronikService: ChronikService) {
        this.dbService = dbService;
        this.chronikService = chronikService;
    }

    /**
     * Daily reconciliation task
     * - Check for missing blocks in the last 24 hours
     * - Update daily aggregations
     * - Refresh cumulative materialized views
     */
    async performDailyReconciliation(): Promise<void> {
        try {
            logger.info('Starting daily reconciliation...');

            // Get current chain tip
            const blockchainInfo =
                await this.chronikService.getBlockchainInfo();
            const currentTipHeight = blockchainInfo.tipHeight;

            // Get the highest block in our database
            const highestBlockHeight =
                await this.dbService.getHighestBlockHeight();
            const lowestBlockHeight =
                await this.dbService.getLowestBlockHeight();

            logger.info(
                `Database range: ${lowestBlockHeight} - ${highestBlockHeight}`,
            );
            logger.info(`Current chain tip: ${currentTipHeight}`);

            // Check for missing blocks in the entire database range
            const missingBlocks = await this.dbService.getMissingBlocks(
                lowestBlockHeight,
                Math.max(highestBlockHeight, currentTipHeight),
            );

            if (missingBlocks.length > 0) {
                logger.info(
                    `Found ${
                        missingBlocks.length
                    } missing blocks: ${missingBlocks.join(', ')}`,
                );
                await this.processMissingBlocks(missingBlocks);
            } else {
                logger.info('No missing blocks found');
            }

            // Update daily aggregations for the last 7 days
            await this.updateRecentDailyAggregations();

            // Refresh cumulative materialized views to include new data
            await this.refreshCumulativeViews();

            // NB we do not update any missing prices, this must
            // be done manually
            // We do not have a reliable price API that can cover all
            // days we want to chart

            logger.info('Daily reconciliation completed');
        } catch (error) {
            logger.error('Daily reconciliation failed:', error);
            throw error;
        }
    }

    /**
     * Process missing blocks by fetching them from Chronik
     */
    private async processMissingBlocks(
        missingHeights: number[],
    ): Promise<void> {
        logger.info(`Processing ${missingHeights.length} missing blocks...`);

        // Process blocks in batches to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < missingHeights.length; i += batchSize) {
            const batch = missingHeights.slice(i, i + batchSize);
            logger.info(
                `Processing batch ${Math.floor(i / batchSize) + 1}: heights ${
                    batch[0]
                } - ${batch[batch.length - 1]}`,
            );

            for (const height of batch) {
                try {
                    // Check if block still doesn't exist (in case it was added by another process)
                    const existingBlock = await this.dbService.getBlockByHeight(
                        height,
                    );
                    if (existingBlock) {
                        logger.debug(
                            `Block ${height} already exists, skipping`,
                        );
                        continue;
                    }

                    // Get block data from Chronik
                    const blockInfo = await this.chronikService.getBlock(
                        height,
                    );
                    if (!blockInfo) {
                        logger.error(
                            `Failed to get block ${height} from Chronik`,
                        );
                        continue;
                    }

                    // Transform and save block data
                    const blockData =
                        await this.chronikService.transformBlockData(blockInfo);
                    await this.dbService.saveBlocks([blockData]);
                    logger.info(`Processed missing block ${height}`);

                    // Add a small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    logger.error(
                        `Error processing missing block ${height}:`,
                        error,
                    );
                }
            }

            // Add delay between batches
            if (i + batchSize < missingHeights.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    /**
     * Update daily aggregations for recent days
     */
    private async updateRecentDailyAggregations(): Promise<void> {
        try {
            logger.info('Updating recent daily aggregations...');

            // Get the last 7 days
            const today = new Date();
            const datesToUpdate: string[] = [];

            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                if (dateStr) {
                    datesToUpdate.push(dateStr);
                }
            }

            for (const date of datesToUpdate) {
                try {
                    await this.dbService.aggregateDailyData(
                        date,
                        this.chronikService,
                    );
                    logger.debug(`Updated daily aggregation for ${date}`);
                } catch (error) {
                    logger.error(
                        `Failed to update daily aggregation for ${date}:`,
                        error,
                    );
                }
            }

            logger.info('Recent daily aggregations updated');
        } catch (error) {
            logger.error('Error updating recent daily aggregations:', error);
            throw error;
        }
    }

    /**
     * Refresh cumulative materialized views to include new data
     */
    private async refreshCumulativeViews(): Promise<void> {
        try {
            logger.info('Refreshing cumulative materialized views...');
            await this.dbService.refreshCumulativeViews();
            logger.info('Cumulative materialized views refreshed');
        } catch (error) {
            logger.error(
                'Error refreshing cumulative materialized views:',
                error,
            );
            throw error;
        }
    }
}
