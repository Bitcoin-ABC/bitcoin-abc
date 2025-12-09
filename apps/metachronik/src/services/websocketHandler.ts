// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { ChronikClient, WsEndpoint, WsMsgClient } from 'chronik-client';
import DatabaseService from './database';
import ChronikService from './chronik';
import { ReconciliationService } from './reconciliationService';
import logger from '../utils/logger';

export class WebSocketHandler {
    private chronik: ChronikClient;
    private dbService: DatabaseService;
    private chronikService: ChronikService;
    private reconciliationService: ReconciliationService;
    private ws: WsEndpoint | null = null;
    private isProcessing = false;

    constructor(
        chronik: ChronikClient,
        dbService: DatabaseService,
        chronikService: ChronikService,
        reconciliationService: ReconciliationService,
    ) {
        this.chronik = chronik;
        this.dbService = dbService;
        this.chronikService = chronikService;
        this.reconciliationService = reconciliationService;
    }

    public async initialize(): Promise<void> {
        try {
            logger.info('Initializing WebSocket connection...');

            // Create WebSocket connection
            this.ws = this.chronik.ws({
                onMessage: async (msg: WsMsgClient) => {
                    await this.handleWebSocketMessage(msg);
                },
                onError: (error: any) => {
                    logger.error('WebSocket error:', error);
                },
                onReconnect: () => {
                    logger.info('WebSocket reconnected');
                },
            });

            // Wait for WebSocket to be connected
            await this.ws.waitForOpen();
            logger.info('WebSocket connection established');

            // Subscribe to block events
            this.ws.subscribeToBlocks();
            logger.info('Subscribed to block events');
        } catch (error) {
            logger.error('Failed to initialize WebSocket:', error);
            throw error;
        }
    }

    private async handleWebSocketMessage(wsMsg: WsMsgClient): Promise<void> {
        try {
            const { type } = wsMsg;

            if (type === 'Error') {
                logger.error('WebSocket error message received:', wsMsg);
                return;
            }

            if (type === 'Block') {
                const blockMsg = wsMsg as any; // Type assertion for block messages
                const { msgType, blockHeight, blockHash } = blockMsg;

                switch (msgType) {
                    case 'BLK_FINALIZED': {
                        await this.handleBlockFinalized(blockHeight, blockHash);
                        break;
                    }
                    case 'BLK_INVALIDATED': {
                        logger.info(
                            `Block ${blockHeight} (${blockHash}) was invalidated`,
                        );
                        // We don't need to do anything special for invalidated blocks
                        // as they won't be in the main chain
                        break;
                    }
                    default:
                        logger.debug(
                            `Unhandled block message type: ${msgType}`,
                        );
                }
            } else if (type === 'Tx') {
                // We're not handling transaction messages for now
                logger.debug('Received transaction message, ignoring');
            }
        } catch (error) {
            logger.error('Error handling WebSocket message:', error);
        }
    }

    private async handleBlockFinalized(
        blockHeight: number,
        blockHash: string,
    ): Promise<void> {
        if (this.isProcessing) {
            logger.debug(`Already processing a block, skipping ${blockHeight}`);
            return;
        }

        this.isProcessing = true;

        try {
            // Get the highest block height in our database
            const highestBlockHeight =
                await this.dbService.getHighestBlockHeight();
            const expectedNextHeight = highestBlockHeight + 1;

            logger.info(
                `Received finalized block ${blockHeight} (${blockHash}) - Expected next: ${expectedNextHeight}`,
            );

            // Check if this is the expected next block
            if (blockHeight !== expectedNextHeight) {
                if (blockHeight < expectedNextHeight) {
                    logger.debug(
                        `Block ${blockHeight} is older than expected next block ${expectedNextHeight}, skipping`,
                    );
                    return;
                } else {
                    logger.warn(
                        `⚠️ Gap detected! Received block ${blockHeight} but expected ${expectedNextHeight}. Missing ${
                            blockHeight - expectedNextHeight
                        } blocks.`,
                    );
                    // Trigger reconciliation to fill the gap
                    await this.reconciliationService.reconcileFromHighestHeight();
                    return;
                }
            }

            // Check if block already exists in database
            const existingBlock =
                await this.dbService.getBlockByHeight(blockHeight);
            if (existingBlock) {
                logger.debug(`Block ${blockHeight} already exists in database`);
                return;
            }

            // Get block data from Chronik
            const blockInfo = await this.chronikService.getBlock(blockHeight);
            if (!blockInfo) {
                logger.error(`Failed to get block ${blockHeight} from Chronik`);
                return;
            }

            // Transform block data
            const blockData =
                await this.chronikService.transformBlockData(blockInfo);

            // Save block to database
            await this.dbService.saveBlocks([blockData]);
            logger.info(`✅ Saved block ${blockHeight} to database`);

            // Aggregate daily data for this block's date
            const blockDate = new Date(blockData.timestamp * 1000)
                .toISOString()
                .split('T')[0];

            if (blockDate) {
                await this.dbService.aggregateDailyData(
                    blockDate,
                    this.chronikService,
                );
                logger.info(`📊 Updated daily aggregation for ${blockDate}`);

                // Refresh cumulative materialized views to include new data
                await this.dbService.refreshCumulativeViews();
                logger.info(`🔄 Refreshed cumulative materialized views`);
            }
        } catch (error) {
            logger.error(
                `Error processing finalized block ${blockHeight}:`,
                error,
            );
        } finally {
            this.isProcessing = false;
        }
    }

    public async close(): Promise<void> {
        if (this.ws) {
            await this.ws.close();
            this.ws = null;
            logger.info('WebSocket connection closed');
        }
    }
}
