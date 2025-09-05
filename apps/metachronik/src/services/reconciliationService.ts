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
     * Reconcile missing blocks starting from the highest height in the database
     * This is only called when we detect a gap in the blockchain
     */
    async reconcileFromHighestHeight(): Promise<void> {
        try {
            logger.info('Starting reconciliation from highest height...');

            // Get the highest block in our database
            const highestBlockHeight =
                await this.dbService.getHighestBlockHeight();

            logger.info(
                `Starting reconciliation from height ${highestBlockHeight + 1}`,
            );

            // Get current chain tip
            const blockchainInfo =
                await this.chronikService.getBlockchainInfo();
            const currentTipHeight = blockchainInfo.tipHeight;

            if (highestBlockHeight >= currentTipHeight) {
                logger.info('Database is up to date, no reconciliation needed');
                return;
            }

            // Process missing blocks from highest height + 1 to current tip
            const missingHeights: number[] = [];
            for (
                let height = highestBlockHeight + 1;
                height <= currentTipHeight;
                height++
            ) {
                missingHeights.push(height);
            }

            if (missingHeights.length > 0) {
                logger.info(
                    `Found ${missingHeights.length} missing blocks: ${
                        missingHeights[0]
                    } - ${missingHeights[missingHeights.length - 1]}`,
                );
                await this.processMissingBlocks(missingHeights);
            }

            logger.info('Reconciliation completed');
        } catch (error) {
            logger.error('Reconciliation failed:', error);
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
}
