// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import dotenv from 'dotenv';
import cron from 'node-cron';
import readline from 'readline';

import { AppConfig } from './types';
import DatabaseService from './services/database';
import ChronikService from './services/chronik';
import { WebSocketHandler } from './services/websocketHandler';
import { ReconciliationService } from './services/reconciliationService';
import logger from './utils/logger';
import { isShutdownRequested, requestShutdown } from './utils/shutdown';

dotenv.config();

// Check for reindex flags
const shouldReindex = process.argv.includes('--reindex');
// Allow skipping the interactive reindex confirmation (for automation)
const skipReindexConfirm =
    process.argv.includes('--yes') || process.argv.includes('-y');

/**
 * Detect transient database/connection errors that are worth backing off and
 * retrying (rather than crashing). Covers dropped connections, timeouts, and
 * "too many connections" from an overloaded Neon compute.
 */
function isRetryableDbError(error: unknown): boolean {
    const message = (
        error instanceof Error ? error.message : String(error)
    ).toLowerCase();
    const code = (error as { code?: string })?.code ?? '';

    const retryableCodes = new Set([
        '08000', // connection_exception
        '08003', // connection_does_not_exist
        '08006', // connection_failure
        '57P01', // admin_shutdown
        '57P03', // cannot_connect_now
        '53300', // too_many_connections
        '53400', // configuration_limit_exceeded
        '40P01', // deadlock_detected
        '57014', // statement_timeout / query_canceled
        'ECONNRESET',
        'ETIMEDOUT',
        'EPIPE',
    ]);

    if (retryableCodes.has(code)) {
        return true;
    }

    return (
        message.includes('connection terminated') ||
        message.includes('connection reset') ||
        message.includes('econnreset') ||
        message.includes('etimedout') ||
        message.includes('timeout') ||
        message.includes('too many connections') ||
        message.includes('terminating connection') ||
        message.includes('server closed the connection') ||
        // pg emits these on in-flight queries when the socket dies mid-request
        message.includes('connection error') ||
        message.includes('not queryable') ||
        message.includes('client has encountered')
    );
}

/**
 * Ask the user to confirm a destructive reindex before proceeding.
 * Resolves true if confirmed, false otherwise.
 */
async function confirmReindex(): Promise<boolean> {
    if (skipReindexConfirm) {
        return true;
    }

    // Cannot prompt without an interactive terminal (e.g. stdin is piped)
    if (!process.stdin.isTTY) {
        logger.error(
            '--reindex requires confirmation but stdin is not a TTY. ' +
                'Re-run in an interactive terminal, or pass --yes to skip this prompt.',
        );
        return false;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        const answer = await new Promise<string>(resolve => {
            rl.question(
                '⚠️  --reindex will DROP and recreate the blocks and days tables, ' +
                    'destroying all existing indexed data.\nAre you sure you want to continue? (y/N) ',
                resolve,
            );
        });
        return answer.trim().toLowerCase() === 'y';
    } finally {
        rl.close();
    }
}

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
let forceExitOnNextSignal = false;
/** True while initialIndexing / collectData / gap-fill is actively indexing. */
let indexingInProgress = false;
/** Cron handle — registered only after initial indexing completes. */
let scheduledCollectionTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Finalize every completed calendar day (aggregate blocks → days, prune DAU
 * staging). Balances are maintained incrementally via the UTXO set.
 */
async function finalizeCompletedDays(options?: {
    includeTipDay?: boolean;
}): Promise<void> {
    if (isShutdownRequested()) {
        return;
    }

    const finalized = await dbService.finalizeCompletedDays(
        chronikService,
        options,
    );
    if (finalized.length > 0) {
        const range =
            finalized.length === 1
                ? finalized[0]
                : `${finalized[0]} → ${finalized[finalized.length - 1]}`;
        logger.info(`Finalized ${finalized.length} calendar day(s): ${range}`);
    }
}

async function initializeServices() {
    try {
        // Initialize database service
        dbService = new DatabaseService(config.database);
        const dbConnected = await dbService['db'].testConnection();
        if (!dbConnected) {
            throw new Error('Failed to connect to database');
        }

        const lockAcquired = await dbService.acquireInstanceLock();
        if (!lockAcquired) {
            throw new Error(
                'Another metachronik indexer is already running. Stop it before starting a new instance.',
            );
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
        // Cron is intentionally NOT started here. During a multi-hour reindex
        // the scheduled collectData would race initialIndexing, merge the same
        // day_addresses rows twice (additive), and corrupt balances.
    } catch (error) {
        logger.error('Failed to initialize services:', error);
        process.exit(1);
    }
}

/**
 * Start the periodic catch-up cron only after bulk/initial indexing finished.
 */
function startScheduledCollection(): void {
    if (scheduledCollectionTask) {
        return;
    }
    scheduledCollectionTask = cron.schedule(config.cronSchedule, async () => {
        if (indexingInProgress) {
            logger.info(
                'Skipping scheduled data collection: indexing already in progress',
            );
            return;
        }
        logger.info('Starting scheduled data collection');
        try {
            await collectData();
            logger.info('Scheduled data collection completed');
        } catch (error) {
            logger.error('Scheduled data collection failed:', error);
        }
    });
    logger.info(
        `Scheduled data collection enabled (cron: ${config.cronSchedule})`,
    );
}

async function detectAndFillGaps() {
    try {
        logger.info('🔍 Checking for gaps in indexed blocks...');

        // Get the highest and lowest block heights in our database
        const highestBlockHeight = await dbService.getHighestBlockHeight();
        const lowestBlockHeight = await dbService.getLowestBlockHeight();

        if (highestBlockHeight < 0) {
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

/**
 * UTXO balances require every spend's prevout to exist in `utxos`. Starting
 * mid-chain without a snapshot leaves the set empty for older outputs.
 */
async function assertUtxoIndexingCanStart(startHeight: number): Promise<void> {
    if (startHeight === 0) {
        return;
    }
    const result = await dbService['db'].query(
        'SELECT COUNT(*)::bigint AS n FROM utxos',
    );
    const utxoCount = BigInt(result.rows[0]?.n ?? 0);
    if (utxoCount === 0n) {
        throw new Error(
            `INITIAL_INDEX_START=${startHeight} is not supported for the UTXO indexer: ` +
                'the utxos table is empty, so spends reference outputs from earlier blocks that were never indexed. ' +
                'Set INITIAL_INDEX_START=0 and index from genesis (use --reindex --yes on a fresh DB if you already started mid-chain).',
        );
    }
}

async function initialIndexing() {
    indexingInProgress = true;
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
            await dbService.resetAddressBalancesForReindex();
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
        } else if (highestBlockHeight < 0) {
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

        await assertUtxoIndexingCanStart(startHeight);

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

        // Finalize staging once after bulk indexing (not mid-loop — that was
        // the main speed bottleneck and raced with cron collectData).
        logger.info(
            '📅 Finalizing completed calendar days after bulk indexing...',
        );
        await finalizeCompletedDays({ includeTipDay: true });

        // Refresh materialized views after all daily aggregation
        await dbService.refreshCumulativeViews();

        logger.info('🎉 Initial indexing completed successfully!');
    } catch (error) {
        logger.error('❌ Initial indexing failed:', error);
        throw error;
    } finally {
        indexingInProgress = false;
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
    // Transaction-count based batches: fetch+save one batch at a time. Blocks
    // within a batch are still loaded from Chronik in parallel. Target size is
    // lowered on transient errors, then recovered toward the env maximum.
    const initialTargetTxCountPerBatch = parseInt(
        process.env.TARGET_TX_COUNT_PER_BATCH || '30000',
    );
    let targetTxCountPerBatch = initialTargetTxCountPerBatch;

    const MIN_TARGET_TX_COUNT_PER_BATCH = parseInt(
        process.env.MIN_TARGET_TX_COUNT_PER_BATCH || '2000',
    );
    const BASE_BACKOFF_MS = 2000;
    const MAX_BACKOFF_MS = 60000;
    const RECOVER_AFTER_SUCCESSES = parseInt(
        process.env.RECOVER_AFTER_SUCCESSES || '10',
        10,
    );

    let consecutiveFailures = 0;
    let consecutiveSuccesses = 0;

    function throttleDown() {
        consecutiveSuccesses = 0;
        const prevTarget = targetTxCountPerBatch;
        targetTxCountPerBatch = Math.max(
            MIN_TARGET_TX_COUNT_PER_BATCH,
            Math.floor(targetTxCountPerBatch / 2),
        );
        if (prevTarget !== targetTxCountPerBatch) {
            logger.warn(
                `⏬ Throttling down: target txs ${prevTarget.toLocaleString()}→${targetTxCountPerBatch.toLocaleString()} ` +
                    `(will recover toward ${initialTargetTxCountPerBatch.toLocaleString()} after ${RECOVER_AFTER_SUCCESSES} stable cycles)`,
            );
        } else {
            logger.warn(
                `⚠️ Already at minimum throttle (target txs ${targetTxCountPerBatch.toLocaleString()}); will keep retrying`,
            );
        }
    }

    function maybeRecover() {
        if (targetTxCountPerBatch >= initialTargetTxCountPerBatch) {
            return;
        }
        consecutiveSuccesses++;
        if (consecutiveSuccesses < RECOVER_AFTER_SUCCESSES) {
            return;
        }
        consecutiveSuccesses = 0;
        const prevTarget = targetTxCountPerBatch;
        targetTxCountPerBatch = Math.min(
            initialTargetTxCountPerBatch,
            targetTxCountPerBatch +
                Math.ceil(initialTargetTxCountPerBatch * 0.25),
        );
        logger.info(
            `⏫ Recovering: target txs ${prevTarget.toLocaleString()}→${targetTxCountPerBatch.toLocaleString()} ` +
                `(max ${initialTargetTxCountPerBatch.toLocaleString()})`,
        );
    }

    const progressInterval = 10000;
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
        `📊 Using transaction-count based batching: target ${targetTxCountPerBatch.toLocaleString()} txs per batch ` +
            `(env max ${initialTargetTxCountPerBatch.toLocaleString()}; throttles down on errors, recovers after ${RECOVER_AFTER_SUCCESSES} stable cycles)`,
    );
    logMemoryUsage();

    /**
     * Live batch progress on a TTY (reporting only — no indexing work).
     * Non-TTY: final ✓ log only.
     */
    function startBatchProgress(heightLabel: string): {
        setPhase: (phase: 'fetch' | 'transform' | 'apply' | 'write') => void;
        setTotal: (total: number) => void;
        tick: () => void;
        succeed: () => void;
        clear: () => void;
    } {
        const useLive = Boolean(process.stdout.isTTY);
        const barWidth = 20;
        let phase: 'fetch' | 'transform' | 'apply' | 'write' = 'fetch';
        let done = 0;
        let total = 0;
        let frame = 0;
        let interval: ReturnType<typeof setInterval> | null = null;

        const paint = () => {
            if (!useLive) {
                return;
            }
            let detail: string;
            if (phase === 'fetch') {
                const dots = '.'.repeat((frame % 3) + 1).padEnd(3);
                detail = `fetch${dots}`;
            } else if (phase === 'write') {
                const dots = '.'.repeat((frame % 3) + 1).padEnd(3);
                detail = `Writing to db${dots}`;
            } else if (phase === 'transform') {
                const pct = total > 0 ? done / total : 0;
                const filled = Math.min(barWidth, Math.round(pct * barWidth));
                const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
                detail = `[${bar}] ${done}/${total} Getting block txs...`;
            } else {
                const pct = total > 0 ? done / total : 0;
                const filled = Math.min(barWidth, Math.round(pct * barWidth));
                const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
                detail = `[${bar}] ${done}/${total} Processing blocks...`;
            }
            process.stdout.write(`\r\x1b[K📦 ${heightLabel} ${detail}`);
        };

        const clearLive = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            if (useLive) {
                process.stdout.write('\r\x1b[K');
            }
        };

        if (useLive) {
            paint();
            interval = setInterval(() => {
                frame++;
                if (phase === 'fetch' || phase === 'write') {
                    paint();
                }
            }, 400);
        }

        return {
            setPhase: next => {
                phase = next;
                if (next === 'transform' || next === 'apply') {
                    done = 0;
                }
                paint();
            },
            setTotal: n => {
                total = n;
                paint();
            },
            tick: () => {
                done++;
                paint();
            },
            succeed: () => {
                clearLive();
                logger.info(`📦 ${heightLabel} ✓`);
            },
            clear: clearLive,
        };
    }

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

    /**
     * Build the next tx-budget batch starting at startHeight.
     * Chronik blocks() max range is 500; we stop once the tx target is filled.
     */
    async function createNextTxBasedBatch(
        startHeight: number,
        maxBlocksToScan: number = 1000,
    ): Promise<{
        startHeight: number;
        endHeight: number;
        estimatedTxCount: number;
    } | null> {
        const currentBatchStart = startHeight;
        let currentBatchTxCount = 0;
        let currentBatchBlockCount = 0;
        let blocksScanned = 0;
        let finalized: {
            startHeight: number;
            endHeight: number;
            estimatedTxCount: number;
        } | null = null;

        while (blocksScanned < maxBlocksToScan && finalized === null) {
            const scanEndHeight = Math.min(
                startHeight + blocksScanned + 50,
                startHeight + maxBlocksToScan,
            );
            const blockInfos = await getBlockInfoRange(
                startHeight + blocksScanned,
                scanEndHeight - 1,
            );

            if (blockInfos.length === 0) {
                break;
            }

            for (const blockInfo of blockInfos) {
                if (!blockInfo) continue;

                const blockTxCount = Number(blockInfo.numTxs || 0);
                blocksScanned++;

                const wouldExceedTxLimit =
                    currentBatchTxCount + blockTxCount >
                        targetTxCountPerBatch && currentBatchTxCount > 0;
                const wouldExceedBlockLimit = currentBatchBlockCount >= 500;

                if (wouldExceedTxLimit || wouldExceedBlockLimit) {
                    finalized = {
                        startHeight: currentBatchStart,
                        endHeight: blockInfo.height - 1,
                        estimatedTxCount: currentBatchTxCount,
                    };
                    break;
                }

                currentBatchTxCount += blockTxCount;
                currentBatchBlockCount++;
            }
        }

        if (finalized) {
            return finalized;
        }

        if (currentBatchTxCount > 0) {
            return {
                startHeight: currentBatchStart,
                endHeight: startHeight + blocksScanned - 1,
                estimatedTxCount: currentBatchTxCount,
            };
        }

        return null;
    }

    // Helper function to process a single batch of blocks
    async function processBatch(
        batchStart: number,
        batchEnd: number,
        progress?: {
            setPhase: (
                phase: 'fetch' | 'transform' | 'apply' | 'write',
            ) => void;
            setTotal: (total: number) => void;
            tick: () => void;
        },
    ): Promise<{
        success: boolean;
        blockDataArray: any[];
        processedCount: number;
        error?: string;
    }> {
        try {
            progress?.setPhase('fetch');
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

            // Process all blocks in the batch in parallel. Track failures so
            // we never save a partial batch: if any block fails to fetch (e.g.
            // a transient Chronik outage), we discard the whole batch and let
            // the range be retried. Silently dropping failed blocks here would
            // create permanent gaps and missing balances — unacceptable for an
            // indexer whose entire purpose is accurate data.
            progress?.setPhase('transform');
            progress?.setTotal(blocks.length);
            let failureCount = 0;
            let firstError: string | undefined;
            const blockPromises = blocks.map(async blockInfo => {
                try {
                    if (!blockInfo) {
                        failureCount++;
                        if (!firstError) {
                            firstError = 'received undefined blockInfo';
                        }
                        return null;
                    }

                    try {
                        return await chronikService.transformBlockData(
                            blockInfo,
                        );
                    } catch (error) {
                        failureCount++;
                        if (!firstError) {
                            firstError =
                                error instanceof Error
                                    ? error.message
                                    : String(error);
                        }
                        return null;
                    }
                } finally {
                    progress?.tick();
                }
            });

            const blockResults = await Promise.all(blockPromises);

            if (failureCount > 0) {
                // One concise line instead of a stack trace per failed block.
                logger.warn(
                    `Batch ${batchStart}-${batchEnd}: ${failureCount}/${blocks.length} blocks failed to fetch ` +
                        `(e.g. "${firstError}"); discarding batch and retrying range`,
                );
                return {
                    success: false,
                    blockDataArray: [],
                    processedCount: 0,
                    error: firstError ?? 'block fetch failed',
                };
            }

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

    while (true) {
        if (isShutdownRequested()) {
            logger.info('Shutdown requested, stopping block indexing');
            break;
        }

        try {
            // If a dropped connection released our advisory lock, re-acquire it
            // before doing more work.
            const locked = await dbService.ensureInstanceLock();
            if (!locked) {
                logger.warn(
                    'Could not hold the instance lock (another indexer may be running). Backing off...',
                );
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }

            // Resume strictly from what is already committed. saveBlocks writes
            // each block's row together with its UTXO events in a single
            // transaction, so the committed tip is an exactly-once watermark.
            // Re-syncing here guarantees that a partially-saved cycle followed
            // by a retry never re-saves an already-committed block — which would
            // otherwise double-apply its UTXO events and corrupt balances.
            const committedTip = await dbService.getHighestBlockHeight();
            if (committedTip + 1 > currentHeight) {
                currentHeight = committedTip + 1;
            }

            const batch = await createNextTxBasedBatch(currentHeight);

            if (!batch) {
                logger.info('✅ No more blocks to process, reached chain tip');
                break;
            }

            const batchLabel = batch.endHeight.toLocaleString();
            const batchProgress = startBatchProgress(batchLabel);

            const result = await processBatch(
                batch.startHeight,
                batch.endHeight,
                batchProgress,
            );

            if (result.error === 'REACHED_TIP') {
                batchProgress.clear();
                logger.info(
                    `✅ Reached chain tip at height ${(
                        batch.startHeight - 1
                    ).toLocaleString()}. Block not found at height ${batch.startHeight.toLocaleString()}`,
                );
                break;
            }

            if (!result.success) {
                batchProgress.clear();
                // Do not advance past a failed batch; back off and retry.
                consecutiveFailures++;
                throttleDown();
                const delay = Math.min(
                    MAX_BACKOFF_MS,
                    BASE_BACKOFF_MS * 2 ** (consecutiveFailures - 1),
                );
                logger.warn(
                    `Chronik fetch failure (#${consecutiveFailures}); backing off ${delay}ms then retrying from ${currentHeight.toLocaleString()}`,
                );
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            try {
                if (result.blockDataArray.length > 0) {
                    batchProgress.setPhase('apply');
                    batchProgress.setTotal(result.blockDataArray.length);
                    await dbService.saveBlocks(result.blockDataArray, {
                        onBlockApplied: () => batchProgress.tick(),
                        onBeforeDbWrite: () => batchProgress.setPhase('write'),
                    });
                    processedBlocks += result.processedCount;

                    if (global.gc) {
                        global.gc();
                    }
                }
                batchProgress.succeed();
            } catch (error) {
                batchProgress.clear();
                throw error;
            }

            // Log progress when we cross height thresholds
            const previousThreshold =
                Math.floor(
                    (batch.endHeight - result.processedCount) /
                        progressInterval,
                ) * progressInterval;
            const currentThreshold =
                Math.floor(batch.endHeight / progressInterval) *
                progressInterval;

            if (currentThreshold > previousThreshold) {
                logger.info(
                    `📈 PROGRESS: Indexed through ${currentThreshold.toLocaleString()}`,
                );
                logMemoryUsage();
            }

            currentHeight = batch.endHeight + 1;

            // Mid-bulk day merges are intentionally skipped here: finalizing
            // every ~1000 blocks spent most of the wall clock on Neon merges and
            // also raced with cron collectData. Staging is merged once at the
            // end of this indexing pass instead.

            consecutiveFailures = 0;
            maybeRecover();

            await new Promise(resolve => setTimeout(resolve, 25));
        } catch (error) {
            // Non-transient errors are real bugs; let them surface.
            if (!isRetryableDbError(error)) {
                throw error;
            }

            // Transient overload/connection error: lower the tx target,
            // back off, and retry. The top-of-loop resume-from-committed-tip
            // resync ensures the retry restarts after the last committed block,
            // so any batch that had already committed in this cycle is not
            // re-saved (which would double-apply its UTXO events).
            consecutiveFailures++;
            throttleDown();
            const delay = Math.min(
                MAX_BACKOFF_MS,
                BASE_BACKOFF_MS * 2 ** (consecutiveFailures - 1),
            );
            logger.warn(
                `Transient DB error (failure #${consecutiveFailures}), retrying in ${delay}ms: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    logger.info(
        `🎉 Indexing completed. Total blocks processed: ${processedBlocks.toLocaleString()}`,
    );

    try {
        await finalizeCompletedDays({ includeTipDay: true });
    } catch (error) {
        logger.warn(
            'Final day finalization after indexing failed; will retry on next run:',
            error,
        );
    }
}

async function collectData() {
    if (indexingInProgress) {
        logger.info(
            'Skipping data collection: another indexing pass is already in progress',
        );
        return;
    }

    indexingInProgress = true;
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

        // Aggregate daily data for new blocks
        logger.info('Aggregating daily data...');
        await finalizeCompletedDays({ includeTipDay: true });

        // Refresh materialized views after aggregation
        await dbService.refreshCumulativeViews();

        logger.info('Data collection completed');
    } catch (error) {
        logger.error('Data collection failed:', error);
        throw error;
    } finally {
        indexingInProgress = false;
    }
}

async function startIndexer() {
    try {
        // Confirm destructive reindex before touching anything
        if (shouldReindex) {
            const confirmed = await confirmReindex();
            if (!confirmed) {
                logger.info('Reindex cancelled by user. Exiting.');
                process.exit(0);
            }
        }

        // Initialize services (cron is NOT started yet)
        await initializeServices();

        // Start initial indexing if needed
        await initialIndexing();

        // Check for and fill any gaps in indexed blocks
        await detectAndFillGaps();

        // Initialize WebSocket for real-time block processing
        await initializeWebSocket();

        // Only now enable scheduled collectData — never while reindex runs
        startScheduledCollection();

        logger.info('All initialization completed successfully');

        // Keep the process running for cron jobs / websocket
        process.stdin.resume();
    } catch (error) {
        logger.error('Failed to start indexer:', error);
        process.exit(1);
    }
}

async function handleShutdownSignal(signal: string): Promise<void> {
    if (forceExitOnNextSignal) {
        logger.warn(`Force exit on second ${signal}`);
        process.exit(1);
    }
    forceExitOnNextSignal = true;
    requestShutdown();
    logger.info(
        `Shutting down gracefully (${signal}, press again to force)...`,
    );

    try {
        if (dbService) {
            await dbService.cancelActiveQuery();
        }
        if (wsHandler) {
            await wsHandler.close();
        }
        if (dbService) {
            await dbService.close();
        }
    } catch (error) {
        logger.warn('Error during shutdown:', error);
    }

    process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    void handleShutdownSignal('SIGINT');
});

process.on('SIGTERM', () => {
    void handleShutdownSignal('SIGTERM');
});

// Last-resort safety net: pg emits an 'error' event on Client instances when a
// connection drops (e.g. Neon closing an idle socket). If it lands on a client
// with no listener it becomes an uncaughtException and kills the process. We
// swallow ONLY transient connection errors here so the indexing loop's retry
// logic can recover; anything else is a real bug and should still crash.
process.on('uncaughtException', (error: Error) => {
    if (isRetryableDbError(error)) {
        logger.warn(
            `Ignoring transient uncaught connection error: ${error.message}`,
        );
        return;
    }
    logger.error('Uncaught exception, exiting:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
    if (isRetryableDbError(reason)) {
        logger.warn(
            `Ignoring transient unhandled rejection: ${
                reason instanceof Error ? reason.message : String(reason)
            }`,
        );
        return;
    }
    logger.error('Unhandled rejection, exiting:', reason);
    process.exit(1);
});

// Start the indexer
startIndexer();
