// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import dotenv from 'dotenv';
import cron from 'node-cron';

import { AppConfig } from './types';
import DatabaseService from './services/database';
import ChronikService from './services/chronik';
import { WebSocketHandler } from './services/websocketHandler';
import { ReconciliationService } from './services/reconciliationService';
import logger from './utils/logger';

dotenv.config();

// Check for reindex flags
const shouldReindex = process.argv.includes('--reindex');

// Configuration
const config: AppConfig = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'chronik_charts',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
    },
    chronik: {
        urls: (process.env.CHRONIK_URLS || 'http://localhost:8080').split(','),
        connectionStrategy:
            (process.env.CHRONIK_STRATEGY as 'closestFirst' | 'asOrdered') ||
            'closestFirst',
    },
    cronSchedule: process.env.CRON_SCHEDULE || '0 */6 * * *', // Every 6 hours
    logLevel: process.env.LOG_LEVEL || 'info',
    // Indexing performance configuration
    indexing: {
        batchSize: parseInt(process.env.INDEXING_BATCH_SIZE || '200'),
        maxConcurrentBatches: parseInt(
            process.env.INDEXING_MAX_CONCURRENT_BATCHES || '3',
        ),
        targetTxCountPerBatch: parseInt(
            process.env.TARGET_TX_COUNT_PER_BATCH || '10000',
        ),
    },
};

// Initialize services
let dbService: DatabaseService;
let chronikService: ChronikService;
let wsHandler: WebSocketHandler;
let reconciliationService: ReconciliationService;

async function initializeServices() {
    try {
        // Initialize database service
        dbService = new DatabaseService(config.database);
        const dbConnected = await dbService['db'].testConnection();
        if (!dbConnected) {
            throw new Error('Failed to connect to database');
        }

        // Initialize database tables
        await dbService.initializeTables();

        // Initialize Chronik service
        chronikService = new ChronikService(config.chronik);
        await chronikService.initialize();

        // Initialize reconciliation service
        reconciliationService = new ReconciliationService(
            dbService,
            chronikService,
        );

        logger.info('All services initialized successfully');

        // Setup cron job for data collection
        cron.schedule(config.cronSchedule, async () => {
            logger.info('Starting scheduled data collection');
            try {
                await collectData();
                logger.info('Scheduled data collection completed');
            } catch (error) {
                logger.error('Scheduled data collection failed:', error);
            }
        });
    } catch (error) {
        logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

async function detectAndFillGaps() {
    try {
        logger.info('🔍 Checking for gaps in indexed blocks...');

        // Get the highest and lowest block heights in our database
        const highestBlockHeight = await dbService.getHighestBlockHeight();
        const lowestBlockHeight = await dbService.getLowestBlockHeight();

        if (highestBlockHeight === 0) {
            logger.info('No blocks in database, skipping gap detection');
            return;
        }

        // Use the existing getMissingBlocks method to find gaps
        const missingBlocks = await dbService.getMissingBlocks(
            lowestBlockHeight,
            highestBlockHeight,
        );

        if (missingBlocks.length === 0) {
            logger.info('✅ No gaps found in indexed blocks');
            return;
        }

        logger.info(
            `🔧 Found ${missingBlocks.length} missing blocks in range ${lowestBlockHeight} - ${highestBlockHeight}`,
        );

        // Group consecutive missing blocks into ranges for better logging
        const gaps: Array<{ start: number; end: number }> = [];

        if (missingBlocks.length > 0) {
            const firstBlock = missingBlocks[0];
            if (firstBlock !== undefined) {
                let currentGapStart = firstBlock;
                let currentGapEnd = firstBlock;

                for (let i = 1; i < missingBlocks.length; i++) {
                    const block = missingBlocks[i];
                    if (block !== undefined && block === currentGapEnd + 1) {
                        // Consecutive block, extend current gap
                        currentGapEnd = block;
                    } else if (block !== undefined) {
                        // Non-consecutive, save current gap and start new one
                        gaps.push({
                            start: currentGapStart,
                            end: currentGapEnd,
                        });
                        currentGapStart = block;
                        currentGapEnd = block;
                    }
                }

                // Add the last gap
                gaps.push({ start: currentGapStart, end: currentGapEnd });
            }
        }

        logger.info(`📊 Gap summary:`);
        for (const gap of gaps) {
            const blockCount = gap.end - gap.start + 1;
            logger.info(
                `   Gap: ${gap.start} to ${gap.end} (${blockCount} blocks)`,
            );
        }

        // Fill each gap by indexing from the start of each gap
        for (const gap of gaps) {
            logger.info(
                `🔄 Filling gap from height ${gap.start} to ${gap.end}...`,
            );
            await indexBlocksInRange(gap.start);
        }

        logger.info('✅ All gaps have been filled');
    } catch (error) {
        logger.error('Error during gap detection and filling:', error);
        throw error;
    }
}

async function initialIndexing() {
    try {
        logger.info('🚀 Starting initial indexing...');

        if (shouldReindex) {
            logger.info(
                '🔄 Reindex flag detected, dropping and recreating all tables...',
            );
            // Drop both tables if they exist
            await dbService['db'].query('DROP TABLE IF EXISTS blocks CASCADE');
            await dbService['db'].query('DROP TABLE IF EXISTS days CASCADE');
            logger.info('🗑️ Blocks and days tables dropped');

            // Recreate both tables
            await dbService.recreateBlocksTable();
            await dbService.recreateDaysTable();
            logger.info(
                '📋 Blocks and days tables recreated, starting fresh indexing',
            );
        }

        // Get current chain tip from Chronik
        const blockchainInfo = await chronikService.getBlockchainInfo();
        const currentTipHeight = blockchainInfo.tipHeight;
        logger.info(
            `📊 Current chain tip height: ${currentTipHeight.toLocaleString()}`,
        );

        // Get the highest block height in our database
        const highestBlockHeight = await dbService.getHighestBlockHeight();
        logger.info(
            `📈 Highest block in database: ${highestBlockHeight.toLocaleString()}`,
        );

        // Determine where to start indexing
        let startHeight: number;

        if (shouldReindex) {
            // Force reindex: start from INITIAL_INDEX_START or 0
            startHeight = parseInt(process.env.INITIAL_INDEX_START || '0');
            logger.info(
                `🔄 Reindex mode: starting from ${startHeight.toLocaleString()}`,
            );
        } else if (highestBlockHeight === 0) {
            // No blocks in database: start from INITIAL_INDEX_START or 0
            startHeight = parseInt(process.env.INITIAL_INDEX_START || '0');
            logger.info(
                `🆕 Empty database: starting from ${startHeight.toLocaleString()}`,
            );
        } else {
            // Continue from where we left off
            startHeight = highestBlockHeight + 1;
            logger.info(
                `🔄 Continuing from block ${startHeight.toLocaleString()}`,
            );
        }

        const endHeight = currentTipHeight;

        // Check if we're already up to date
        if (startHeight > endHeight) {
            logger.info(
                `✅ Database is up to date! Highest block (${highestBlockHeight.toLocaleString()}) >= chain tip (${currentTipHeight.toLocaleString()})`,
            );
            // Don't return early - we still need to check/create the days table
        } else {
            // Index missing blocks until we reach the chain tip
            logger.info(
                `📈 Indexing blocks from ${startHeight.toLocaleString()} until chain tip is reached`,
            );

            await indexBlocksInRange(startHeight);
        }

        // Check if days table exists and has data
        const daysTableExists = await dbService.daysTableExists();
        const daysCount = await dbService.getDaysCount();

        logger.info(
            `📅 Days table exists: ${daysTableExists}, Days count: ${daysCount}`,
        );

        // Aggregate daily data
        if (daysTableExists && daysCount > 0) {
            // Days table already exists and has data - only aggregate newly indexed blocks
            logger.info(
                '📅 Aggregating daily data for newly indexed blocks...',
            );
            const newBlocks = await dbService.getBlocksInRange(
                startHeight,
                endHeight,
            );
            const datesToAggregate = new Set<string>();

            for (const block of newBlocks) {
                const date = new Date(block.timestamp * 1000)
                    .toISOString()
                    .split('T')[0];
                if (date) {
                    datesToAggregate.add(date);
                }
            }

            logger.info(
                `📊 Aggregating data for ${datesToAggregate.size} unique days...`,
            );
            for (const date of datesToAggregate) {
                await dbService.aggregateDailyData(date, chronikService);
            }
        } else {
            // Days table doesn't exist OR is empty - aggregate ALL blocks in the database
            logger.info('📅 Creating days table from ALL existing blocks...');
            const allBlocks = await dbService.query(
                'SELECT * FROM blocks ORDER BY height',
            );
            const datesToAggregate = new Set<string>();

            for (const block of allBlocks.rows) {
                const date = new Date(block.timestamp * 1000)
                    .toISOString()
                    .split('T')[0];
                if (date) {
                    datesToAggregate.add(date);
                }
            }

            logger.info(
                `📊 Aggregating data for ${datesToAggregate.size} unique days from ${allBlocks.rows.length} blocks...`,
            );
            for (const date of datesToAggregate) {
                await dbService.aggregateDailyData(date, chronikService);
            }
        }

        logger.info('🎉 Initial indexing completed successfully!');
    } catch (error) {
        logger.error('❌ Initial indexing failed:', error);
        throw error;
    }
}

async function initializeWebSocket(): Promise<void> {
    try {
        logger.info('Initializing WebSocket for real-time block processing...');

        // Initialize WebSocket handler
        wsHandler = new WebSocketHandler(
            chronikService['chronik'], // Access the private chronik instance
            dbService,
            chronikService,
            reconciliationService,
        );

        await wsHandler.initialize();
        logger.info('WebSocket initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize WebSocket:', error);
        throw error;
    }
}

async function indexBlocksInRange(startHeight: number) {
    // Configuration for transaction-count based batching
    const targetTxCountPerBatch = parseInt(
        process.env.TARGET_TX_COUNT_PER_BATCH || '30000',
    ); // Target transactions per batch
    const maxConcurrentBatches = parseInt(
        process.env.INDEXING_MAX_CONCURRENT_BATCHES || '12',
    ); // Max concurrent batches
    const progressInterval = 500;
    let processedBlocks = 0;
    let currentHeight = startHeight;

    // Memory monitoring function
    function logMemoryUsage() {
        const memUsage = process.memoryUsage();
        const memMB = {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        };
        logger.info(
            `💾 Memory usage: RSS=${memMB.rss}MB, Heap=${memMB.heapUsed}MB/${memMB.heapTotal}MB`,
        );
    }

    logger.info(
        `🚀 Starting to index blocks from ${startHeight.toLocaleString()} (will continue until chain tip is reached)`,
    );
    logger.info(
        `📊 Using transaction-count based batching: target ${targetTxCountPerBatch.toLocaleString()} txs per batch, max ${maxConcurrentBatches} concurrent batches`,
    );
    logMemoryUsage();

    // Helper function to get block info for a range (without full transaction data)
    async function getBlockInfoRange(
        startHeight: number,
        endHeight: number,
    ): Promise<any[]> {
        try {
            return await chronikService.getBlocks(startHeight, endHeight);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);

            // Check if this is a "block not found" error (404) - we've reached the chain tip
            if (
                errorMessage.includes('404') ||
                errorMessage.includes('Block not found')
            ) {
                return [];
            }

            throw error;
        }
    }

    // Helper function to create transaction-count based batches
    async function createTxBasedBatches(
        startHeight: number,
        maxBlocksToScan: number = 1000, // Limit how far ahead we scan
    ): Promise<
        Array<{
            startHeight: number;
            endHeight: number;
            estimatedTxCount: number;
        }>
    > {
        const batches: Array<{
            startHeight: number;
            endHeight: number;
            estimatedTxCount: number;
        }> = [];
        let currentBatchStart = startHeight;
        let currentBatchTxCount = 0;
        let currentBatchBlockCount = 0;
        let blocksScanned = 0;

        // Scan blocks to group them by transaction count
        while (blocksScanned < maxBlocksToScan) {
            const scanEndHeight = Math.min(
                startHeight + blocksScanned + 50,
                startHeight + maxBlocksToScan,
            );
            const blockInfos = await getBlockInfoRange(
                startHeight + blocksScanned,
                scanEndHeight - 1,
            );

            if (blockInfos.length === 0) {
                // Reached chain tip
                break;
            }

            for (const blockInfo of blockInfos) {
                if (!blockInfo) continue;

                const blockTxCount = Number(blockInfo.numTxs || 0);
                blocksScanned++;

                // Check if we need to finalize the current batch
                // Either due to transaction count limit OR block count limit (Chronik API limit is 500)
                const wouldExceedTxLimit =
                    currentBatchTxCount + blockTxCount >
                        targetTxCountPerBatch && currentBatchTxCount > 0;
                const wouldExceedBlockLimit = currentBatchBlockCount >= 500;

                if (wouldExceedTxLimit || wouldExceedBlockLimit) {
                    batches.push({
                        startHeight: currentBatchStart,
                        endHeight: blockInfo.height - 1,
                        estimatedTxCount: currentBatchTxCount,
                    });

                    // Start new batch with this block
                    currentBatchStart = blockInfo.height;
                    currentBatchTxCount = blockTxCount;
                    currentBatchBlockCount = 1;
                } else {
                    // Add to current batch
                    currentBatchTxCount += blockTxCount;
                    currentBatchBlockCount++;
                }
            }
        }

        // Add the final batch if it has any blocks
        if (currentBatchTxCount > 0) {
            batches.push({
                startHeight: currentBatchStart,
                endHeight: startHeight + blocksScanned - 1,
                estimatedTxCount: currentBatchTxCount,
            });
        }

        return batches;
    }

    // Helper function to process a single batch of blocks
    async function processBatch(
        batchStart: number,
        batchEnd: number,
    ): Promise<{
        success: boolean;
        blockDataArray: any[];
        processedCount: number;
        error?: string;
    }> {
        try {
            // Get all blocks in the batch in one API call
            const blocks = await chronikService.getBlocks(batchStart, batchEnd);

            if (!blocks || blocks.length === 0) {
                return {
                    success: true,
                    blockDataArray: [],
                    processedCount: 0,
                    error: 'REACHED_TIP',
                };
            }

            // Process all blocks in the batch in parallel
            const blockPromises = blocks.map(async blockInfo => {
                if (!blockInfo) {
                    logger.error('Received undefined blockInfo');
                    return null;
                }

                try {
                    const blockData = await chronikService.transformBlockData(
                        blockInfo,
                    );
                    return blockData;
                } catch (error) {
                    logger.error(
                        `Failed to transform block ${blockInfo.height}:`,
                        error,
                    );
                    return null;
                }
            });

            const blockResults = await Promise.all(blockPromises);
            const blockDataArray = blockResults.filter(
                result => result !== null,
            );

            return {
                success: true,
                blockDataArray,
                processedCount: blockDataArray.length,
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);

            // Check if this is a "block not found" error (404) - we've reached the chain tip
            if (
                errorMessage.includes('404') ||
                errorMessage.includes('Block not found')
            ) {
                return {
                    success: true,
                    blockDataArray: [],
                    processedCount: 0,
                    error: 'REACHED_TIP',
                };
            }

            logger.error(
                `❌ Error processing batch ${batchStart} to ${batchEnd}:`,
                error,
            );
            return {
                success: false,
                blockDataArray: [],
                processedCount: 0,
                error: errorMessage,
            };
        }
    }

    // Helper function to process multiple batches in parallel
    async function processBatchesInParallel(
        batches: Array<{
            startHeight: number;
            endHeight: number;
            estimatedTxCount: number;
        }>,
    ): Promise<{
        totalProcessed: number;
        reachedTip: boolean;
        highestProcessedHeight: number;
    }> {
        const batchPromises = batches.map(batch =>
            processBatch(batch.startHeight, batch.endHeight),
        );

        const results = await Promise.all(batchPromises);

        let totalProcessed = 0;
        let reachedTip = false;
        let highestProcessedHeight = currentHeight - 1;

        // Process results sequentially to save memory
        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const batch = batches[i];

            if (!result || !batch) {
                logger.warn(
                    `⚠️ Skipping undefined result or batch at index ${i}`,
                );
                continue;
            }

            if (result.error === 'REACHED_TIP') {
                reachedTip = true;
                logger.info(
                    `✅ Reached chain tip at height ${(
                        batch.startHeight - 1
                    ).toLocaleString()}. Block not found at height ${batch.startHeight.toLocaleString()}`,
                );
                break;
            }

            if (result.success && result.blockDataArray.length > 0) {
                // Save blocks immediately to free memory
                await dbService.saveBlocks(result.blockDataArray);
                totalProcessed += result.processedCount;
                highestProcessedHeight = Math.max(
                    highestProcessedHeight,
                    batch.endHeight,
                );

                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            } else if (!result.success) {
                logger.warn(
                    `⚠️ Batch ${batch.startHeight}-${batch.endHeight} failed, will retry later`,
                );
            }
        }

        return { totalProcessed, reachedTip, highestProcessedHeight };
    }

    while (true) {
        // Create transaction-count based batches
        const batches = await createTxBasedBatches(currentHeight);

        if (batches.length === 0) {
            logger.info('✅ No more blocks to process, reached chain tip');
            break;
        }

        // Limit to maxConcurrentBatches
        const batchesToProcess = batches.slice(0, maxConcurrentBatches);

        const totalTxs = batchesToProcess.reduce(
            (sum, batch) => sum + batch.estimatedTxCount,
            0,
        );
        const highestHeight =
            batchesToProcess[batchesToProcess.length - 1]?.endHeight || 0;

        logger.info(
            `📦 Processing ${
                batchesToProcess.length
            } batches: thru ${highestHeight.toLocaleString()} (~${totalTxs.toLocaleString()} txs)`,
        );

        // Process batches in parallel
        const { totalProcessed, reachedTip, highestProcessedHeight } =
            await processBatchesInParallel(batchesToProcess);

        // Update counters
        processedBlocks += totalProcessed;

        // Log progress when we cross height thresholds
        const previousThreshold =
            Math.floor(
                (highestProcessedHeight - totalProcessed) / progressInterval,
            ) * progressInterval;
        const currentThreshold =
            Math.floor(highestProcessedHeight / progressInterval) *
            progressInterval;

        if (currentThreshold > previousThreshold) {
            logger.info(
                `📈 PROGRESS: Indexed through ${currentThreshold.toLocaleString()}`,
            );
            logMemoryUsage(); // Log memory usage with progress
        }

        // Check if we've reached the chain tip
        if (reachedTip) {
            break;
        }

        // Move to next set of batches
        currentHeight = highestProcessedHeight + 1;

        // Add a small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 25));
    }

    logger.info(
        `🎉 Indexing completed. Total blocks processed: ${processedBlocks.toLocaleString()}`,
    );
}

async function collectData() {
    try {
        logger.info('Starting data collection...');

        // Get the highest block height in our database
        const highestBlockHeight = await dbService.getHighestBlockHeight();
        logger.info(`Highest block in database: ${highestBlockHeight}`);

        // Get current chain tip
        const blockchainInfo = await chronikService.getBlockchainInfo();
        const currentTipHeight = blockchainInfo.tipHeight;
        logger.info(`Current chain tip: ${currentTipHeight}`);

        if (currentTipHeight <= highestBlockHeight) {
            logger.info('Database is up to date, no new blocks to collect');
            return;
        }

        // Index new blocks until we reach the chain tip
        const startHeight = highestBlockHeight + 1;

        logger.info(
            `Indexing new blocks from ${startHeight} until chain tip is reached`,
        );
        await indexBlocksInRange(startHeight);

        // Get the new highest block height after indexing
        const newHighestBlockHeight = await dbService.getHighestBlockHeight();

        // Check if days table exists and has data
        const daysTableExists = await dbService.daysTableExists();
        const daysCount = await dbService.getDaysCount();

        logger.info(
            `📅 Days table exists: ${daysTableExists}, Days count: ${daysCount}`,
        );

        // Aggregate daily data for new blocks
        logger.info('Aggregating daily data...');
        const newBlocks = await dbService.getBlocksInRange(
            startHeight,
            newHighestBlockHeight,
        );
        const datesToAggregate = new Set<string>();

        for (const block of newBlocks) {
            const date = new Date(block.timestamp * 1000)
                .toISOString()
                .split('T')[0];
            if (date) {
                datesToAggregate.add(date);
            }
        }

        for (const date of datesToAggregate) {
            await dbService.aggregateDailyData(date, chronikService);
        }

        logger.info('Data collection completed');
    } catch (error) {
        logger.error('Data collection failed:', error);
        throw error;
    }
}

async function startIndexer() {
    try {
        // Initialize services
        await initializeServices();

        // Start initial indexing if needed
        await initialIndexing();

        // Check for and fill any gaps in indexed blocks
        await detectAndFillGaps();

        // Initialize WebSocket for real-time block processing
        await initializeWebSocket();

        logger.info('All initialization completed successfully');
        logger.info(
            'Indexer is now running with cron jobs for data collection',
        );

        // Keep the process running for cron jobs
        process.stdin.resume();
    } catch (error) {
        logger.error('Failed to start indexer:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    if (wsHandler) {
        await wsHandler.close();
    }
    if (dbService) {
        await dbService['db'].close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Shutting down gracefully...');
    if (wsHandler) {
        await wsHandler.close();
    }
    if (dbService) {
        await dbService['db'].close();
    }
    process.exit(0);
});

// Start the indexer
startIndexer();
