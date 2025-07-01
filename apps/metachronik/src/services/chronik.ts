// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { ChronikConfig, BlockData } from '../types';
import logger from '../utils/logger';

// Constants for reward calculations
const STAKING_ACTIVATION_HEIGHT = 818670;
const IFP_ACTIVATION_HEIGHT = 661648;
/** The IFP outputScript at XEC activation */
const IFP_OUTPUTSCRIPT_OLD = 'a914260617ebf668c9102f71ce24aba97fcaaf9c666a87';

/** At block 739536, IFP rewards start going to this outputScript */
const IFP_OUTPUTSCRIPT_NEW = 'a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087';
const IFP_OUTPUTSCRIPT_CHANGE_HEIGHT = 739536;
const STAKING_REWARDS_PERCENT = 10n;

// Price API endpoint
const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// First XEC block is 661642 (used for transaction data optimization)
const FIRST_BLOCK_XEC = 661642;

class ChronikService {
    private chronik!: ChronikClient;
    private config: ChronikConfig;

    constructor(config: ChronikConfig) {
        this.config = config;
    }

    public async initialize(): Promise<void> {
        try {
            const strategy =
                this.config.connectionStrategy === 'closestFirst'
                    ? ConnectionStrategy.ClosestFirst
                    : ConnectionStrategy.AsOrdered;

            this.chronik = await ChronikClient.useStrategy(
                strategy,
                this.config.urls,
            );
            logger.info('Chronik client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Chronik client:', error);
            throw error;
        }
    }

    public async getLatestBlock(): Promise<any> {
        try {
            const blocks = await this.chronik.blocks(0, 1);
            return blocks[0];
        } catch (error) {
            logger.error('Failed to get latest block:', error);
            throw error;
        }
    }

    public async getBlocks(
        startHeight: number,
        endHeight: number,
    ): Promise<any[]> {
        try {
            return await this.chronik.blocks(startHeight, endHeight);
        } catch (error) {
            logger.error(
                `Failed to get blocks ${startHeight}-${endHeight}:`,
                error,
            );
            throw error;
        }
    }

    public async getBlock(height: number): Promise<any> {
        try {
            return await this.chronik.block(height);
        } catch (error) {
            logger.error(`Failed to get block ${height}:`, error);
            throw error;
        }
    }

    public async getBlockTxs(height: number): Promise<any> {
        try {
            return await this.chronik.blockTxs(height);
        } catch (error) {
            logger.error(`Failed to get block txs ${height}:`, error);
            throw error;
        }
    }

    /**
     * Get all block transactions efficiently
     * For blocks with ≤200 transactions, get all in one call
     * For blocks with >200 transactions, use pagination
     */
    public async getAllBlockTxs(
        height: number,
        numTxs?: number,
    ): Promise<any[]> {
        try {
            // If we don't have numTxs, we need to get it from the block info
            if (numTxs === undefined) {
                const blockInfo = await this.getBlock(height);
                numTxs = blockInfo.numTxs;
            }

            // For blocks with ≤200 transactions, get all in one call
            if (numTxs && numTxs <= 200) {
                const response = await this.chronik.blockTxs(height, 0, numTxs);
                return response.txs || [];
            }

            // For blocks with >200 transactions, use pagination
            const allTxs: any[] = [];
            let page = 0;
            const pageSize = 200;

            while (true) {
                const response = await this.chronik.blockTxs(
                    height,
                    page,
                    pageSize,
                );
                if (!response.txs || response.txs.length === 0) {
                    break;
                }
                allTxs.push(...response.txs);

                // If we got fewer transactions than the page size, we've reached the end
                if (response.txs.length < pageSize) {
                    break;
                }
                page++;
            }

            return allTxs;
        } catch (error) {
            logger.error(`Failed to get all block txs ${height}:`, error);
            throw error;
        }
    }

    /**
     * Count cachet claims in block transactions
     */
    private countCachetClaims(blockTxs: any[]): number {
        const CACHET_INPUT_SCRIPT =
            '76a914821407ac2993f8684227004f4086082f3f801da788ac';
        const CACHET_TOKEN_ID =
            'aed861a31b96934b88c0252ede135cb9700d7649f69191235087a3030e553cb1';
        const CACHET_CLAIM_AMOUNT = 10000n;

        let count = 0;
        for (const tx of blockTxs) {
            // Skip coinbase transaction
            if (tx.isCoinbase) continue;

            // Check if first input has the cachet address
            if (
                tx.inputs &&
                tx.inputs.length > 0 &&
                tx.inputs[0].outputScript === CACHET_INPUT_SCRIPT
            ) {
                // Check if any output sends the specific token amount
                if (tx.outputs) {
                    for (const output of tx.outputs) {
                        if (
                            output.token &&
                            output.token.tokenId === CACHET_TOKEN_ID &&
                            output.token.atoms === CACHET_CLAIM_AMOUNT
                        ) {
                            count++;
                            break; // Count this transaction only once
                        }
                    }
                }
            }
        }
        return count;
    }

    /**
     * Count cashtab faucet claims in block transactions
     */
    private countCashtabFaucetClaims(blockTxs: any[]): number {
        const CACHET_INPUT_SCRIPT =
            '76a914821407ac2993f8684227004f4086082f3f801da788ac';
        const FAUCET_AMOUNT = 4200n;

        let count = 0;
        for (const tx of blockTxs) {
            // Skip coinbase transaction
            if (tx.isCoinbase) continue;

            // Check if first input has the cachet address
            if (
                tx.inputs &&
                tx.inputs.length > 0 &&
                tx.inputs[0].outputScript === CACHET_INPUT_SCRIPT
            ) {
                // Check if any output sends exactly 4200 sats
                if (tx.outputs) {
                    for (const output of tx.outputs) {
                        if (BigInt(output.sats) === FAUCET_AMOUNT) {
                            count++;
                            break; // Count this transaction only once
                        }
                    }
                }
            }
        }
        return count;
    }

    /**
     * Count and sum Binance withdrawals in block transactions
     */
    private countBinanceWithdrawals(blockTxs: any[]): {
        count: number;
        totalSats: bigint;
    } {
        const BINANCE_INPUT_SCRIPT =
            '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac';
        const BINANCE_OUTPUT_SCRIPT =
            '76a914231f7087937684790d1049294f3aef9cfb7b05dd88ac';

        let count = 0;
        let totalSats = 0n;

        for (const tx of blockTxs) {
            // Skip coinbase transaction
            if (tx.isCoinbase) continue;

            // Check if first input has the Binance address
            if (
                tx.inputs &&
                tx.inputs.length > 0 &&
                tx.inputs[0].outputScript === BINANCE_INPUT_SCRIPT
            ) {
                // Count outputs that are NOT to the Binance address
                if (tx.outputs) {
                    for (const output of tx.outputs) {
                        if (output.outputScript !== BINANCE_OUTPUT_SCRIPT) {
                            count++;
                            totalSats += BigInt(output.sats);
                        }
                    }
                }
            }
        }
        return { count, totalSats };
    }

    /**
     * Calculate coinbase reward amounts from block transactions
     */
    private calculateCoinbaseRewards(
        height: number,
        coinbaseOutputs: any[],
    ): {
        sum_coinbase_output_sats: bigint;
        miner_reward_sats: bigint;
        staking_reward_sats: bigint;
        ifp_reward_sats: bigint;
    } {
        // Calculate total coinbase output sats
        const sum_coinbase_output_sats = coinbaseOutputs.reduce(
            (sum, output) => sum + BigInt(output.sats),
            0n,
        );

        let ifp_reward_sats = 0n;
        let staking_reward_sats = 0n;
        let miner_reward_sats = 0n;

        // Step 1: Find IFP reward (guaranteed to exist after activation)
        if (height >= IFP_ACTIVATION_HEIGHT) {
            const ifpOutputScript =
                height >= IFP_OUTPUTSCRIPT_CHANGE_HEIGHT
                    ? IFP_OUTPUTSCRIPT_NEW
                    : IFP_OUTPUTSCRIPT_OLD;

            for (const output of coinbaseOutputs) {
                if (output.outputScript === ifpOutputScript) {
                    ifp_reward_sats = BigInt(output.sats);
                    break;
                }
            }
        }

        // Step 2: Find staking reward among remaining outputs
        if (height >= STAKING_ACTIVATION_HEIGHT) {
            const minStakerValue =
                (sum_coinbase_output_sats * STAKING_REWARDS_PERCENT) / 100n;
            const STAKER_PERCENT_PADDING = 1n;
            const assumedMaxStakerValue =
                (sum_coinbase_output_sats *
                    (STAKING_REWARDS_PERCENT + STAKER_PERCENT_PADDING)) /
                100n;

            for (const output of coinbaseOutputs) {
                const outputSats = BigInt(output.sats);
                const outputScript = output.outputScript;

                // Skip IFP output when looking for staking reward
                if (height >= IFP_ACTIVATION_HEIGHT) {
                    const ifpOutputScript =
                        height >= IFP_OUTPUTSCRIPT_CHANGE_HEIGHT
                            ? IFP_OUTPUTSCRIPT_NEW
                            : IFP_OUTPUTSCRIPT_OLD;
                    if (outputScript === ifpOutputScript) {
                        continue;
                    }
                }

                if (
                    outputSats >= minStakerValue &&
                    outputSats <= assumedMaxStakerValue
                ) {
                    staking_reward_sats = outputSats;
                    break;
                }
            }
        }

        // Step 3: Calculate miner reward as everything that's not IFP or staking
        miner_reward_sats =
            sum_coinbase_output_sats - ifp_reward_sats - staking_reward_sats;

        return {
            sum_coinbase_output_sats,
            miner_reward_sats,
            staking_reward_sats,
            ifp_reward_sats,
        };
    }

    /**
     * Calculate the total Agora volume from all transactions in a block
     * by summing the sats paid to sellers in Agora BUY transactions
     */
    private calculateAgoraVolumeFromTxs(blockTxs: any[]): {
        agora_volume_sats: bigint;
        agora_volume_xecx_sats: bigint;
        agora_volume_firma_sats: bigint;
    } {
        let totalVolume = 0n;
        let xecxVolume = 0n;
        let firmaVolume = 0n;

        for (const tx of blockTxs) {
            const volume = this.parseAgoraBuyVolume(tx);
            if (volume !== undefined) {
                totalVolume += volume;

                // Check if this is an XECX transaction
                if (
                    tx.tokenEntries &&
                    tx.tokenEntries[0] &&
                    tx.tokenEntries[0].tokenId ===
                        'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4'
                ) {
                    xecxVolume += volume;
                }
                // Check if this is a Firma transaction
                else if (
                    tx.tokenEntries &&
                    tx.tokenEntries[0] &&
                    tx.tokenEntries[0].tokenId ===
                        '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0'
                ) {
                    firmaVolume += volume;
                }
            }
        }

        return {
            agora_volume_sats: totalVolume,
            agora_volume_xecx_sats: xecxVolume,
            agora_volume_firma_sats: firmaVolume,
        };
    }

    /**
     * Parse a transaction to check if it's an Agora BUY transaction
     * and return the sats paid to the seller if it is
     */
    private parseAgoraBuyVolume(tx: any): bigint | undefined {
        const { inputs, outputs } = tx;
        if (!outputs || outputs.length < 2) return undefined;
        for (const input of inputs) {
            if (this.isAgoraPartialInputOrOutput(input)) {
                try {
                    const ops = this.scriptOps(input.inputScript);
                    if (ops.length < 2) continue;
                    // isCanceled is always the last pushop (before redeemScript)
                    const opIsCanceled = ops[ops.length - 2];
                    const OP_0 = 0x00;
                    const isCanceled = opIsCanceled === OP_0;
                    if (!isCanceled) {
                        // For BUY transactions, the sats paid to the seller are at outputs[1]
                        return BigInt(outputs[1].sats);
                    }
                } catch {
                    continue;
                }
            }
        }
        return undefined;
    }

    /**
     * Check if an input or output is an Agora partial (has plugins.agora)
     */
    private isAgoraPartialInputOrOutput(inputOrOutput: any): boolean {
        return (
            typeof inputOrOutput.plugins !== 'undefined' &&
            'agora' in inputOrOutput.plugins
        );
    }

    /**
     * Simple script operations parser (extract opcodes from a hex script)
     */
    private scriptOps(inputScriptHex: string): number[] {
        const bytecode = Buffer.from(inputScriptHex, 'hex');
        const ops: number[] = [];
        let i = 0;
        while (i < bytecode.length) {
            const op = bytecode[i];
            if (typeof op === 'undefined') break;
            ops.push(op);
            // Skip push data
            if (op >= 1 && op <= 78) {
                i += op + 1;
            } else {
                i += 1;
            }
        }
        return ops;
    }

    /**
     * Transform Chronik block data to our simplified format
     * Now fetches both block info and block transactions to calculate rewards
     */
    public async transformBlockData(chronikBlock: any): Promise<BlockData> {
        if (!chronikBlock) {
            throw new Error('Received null or undefined block data');
        }

        // The blocks() method returns BlockInfo objects directly
        // The block() method returns Block objects with blockInfo property
        const blockInfo = chronikBlock.blockInfo || chronikBlock;

        if (
            !blockInfo.height ||
            !blockInfo.hash ||
            !blockInfo.timestamp ||
            blockInfo.numTxs === undefined
        ) {
            logger.error(
                'Invalid block info structure:',
                JSON.stringify(chronikBlock, null, 2),
            );
            throw new Error('Invalid block info structure');
        }

        // Determine if we need to fetch transactions
        const needsTransactionData = this.needsTransactionData(blockInfo);

        let allBlockTxs: any[] = [];
        let coinbaseTx: any;

        if (needsTransactionData) {
            // Only fetch transactions when we actually need them
            // Pass numTxs to optimize the API call
            allBlockTxs = await this.getAllBlockTxs(
                blockInfo.height,
                blockInfo.numTxs,
            );
            coinbaseTx = allBlockTxs[0]; // Coinbase tx is always first

            if (!coinbaseTx || !coinbaseTx.outputs) {
                logger.error(
                    `No coinbase transaction found for block ${blockInfo.height}`,
                );
                throw new Error('No coinbase transaction found');
            }
        } else {
            // Create synthetic coinbase tx from block info for early blocks
            coinbaseTx = {
                isCoinbase: true,
                outputs: [
                    {
                        sats: blockInfo.sumCoinbaseOutputSats,
                        outputScript:
                            '76a914000000000000000000000000000000000000000088ac', // Dummy script
                    },
                ],
            };
            allBlockTxs = [coinbaseTx];

            logger.debug(
                `🚀 Optimized: Block ${blockInfo.height} doesn't need transaction data, skipping blockTxs query`,
            );
        }

        // Calculate reward amounts
        const rewards = this.calculateCoinbaseRewards(
            blockInfo.height,
            coinbaseTx.outputs,
        );

        // Initialize all counts to 0
        let cachetClaimCount = 0;
        let cashtabFaucetClaimCount = 0;
        let binanceWithdrawals = { count: 0, totalSats: 0n };
        let agoraVolumes = {
            agora_volume_sats: 0n,
            agora_volume_xecx_sats: 0n,
            agora_volume_firma_sats: 0n,
        };
        let tokenTypeTxs = {
            tx_count_alp_token_type_standard: 0,
            tx_count_slp_token_type_fungible: 0,
            tx_count_slp_token_type_mint_vault: 0,
            tx_count_slp_token_type_nft1_group: 0,
            tx_count_slp_token_type_nft1_child: 0,
        };
        let app_txs_count = 0;
        let genesisTokenTypeTxs = {
            tx_count_genesis_alp_token_type_standard: 0,
            tx_count_genesis_slp_token_type_fungible: 0,
            tx_count_genesis_slp_token_type_mint_vault: 0,
            tx_count_genesis_slp_token_type_nft1_group: 0,
            tx_count_genesis_slp_token_type_nft1_child: 0,
        };

        // Only calculate detailed metrics if we have transaction data
        if (needsTransactionData && allBlockTxs.length > 1) {
            // Calculate counts for new fields (only for blocks that need it)
            cachetClaimCount = this.countCachetClaims(allBlockTxs);
            cashtabFaucetClaimCount =
                this.countCashtabFaucetClaims(allBlockTxs);
            binanceWithdrawals = this.countBinanceWithdrawals(allBlockTxs);

            // Calculate Agora volume breakdown
            agoraVolumes = this.calculateAgoraVolumeFromTxs(allBlockTxs);

            // Count txs by token type
            tokenTypeTxs = this.countTokenTypeTxs(allBlockTxs);

            // Count app transactions (OP_RETURN txs that are not token txs)
            app_txs_count = this.countAppTxs(allBlockTxs);

            // Count genesis txs by token type for ALP and SLP
            genesisTokenTypeTxs = this.countGenesisTokenTypeTxs(allBlockTxs);
        }

        return {
            height: Number(blockInfo.height),
            hash:
                typeof blockInfo.hash === 'string'
                    ? blockInfo.hash
                    : Buffer.from(blockInfo.hash).toString('hex'),
            timestamp: Number(blockInfo.timestamp),
            tx_count: Number(blockInfo.numTxs),
            tx_count_alp_token_type_standard:
                tokenTypeTxs.tx_count_alp_token_type_standard,
            tx_count_slp_token_type_fungible:
                tokenTypeTxs.tx_count_slp_token_type_fungible,
            tx_count_slp_token_type_mint_vault:
                tokenTypeTxs.tx_count_slp_token_type_mint_vault,
            tx_count_slp_token_type_nft1_group:
                tokenTypeTxs.tx_count_slp_token_type_nft1_group,
            tx_count_slp_token_type_nft1_child:
                tokenTypeTxs.tx_count_slp_token_type_nft1_child,
            block_size: Number(blockInfo.blockSize || 0),
            sum_coinbase_output_sats: rewards.sum_coinbase_output_sats,
            miner_reward_sats: rewards.miner_reward_sats,
            staking_reward_sats: rewards.staking_reward_sats,
            ifp_reward_sats: rewards.ifp_reward_sats,
            cachet_claim_count: cachetClaimCount,
            cashtab_faucet_claim_count: cashtabFaucetClaimCount,
            binance_withdrawal_count: binanceWithdrawals.count,
            binance_withdrawal_sats: binanceWithdrawals.totalSats,
            agora_volume_sats: agoraVolumes.agora_volume_sats,
            agora_volume_xecx_sats: agoraVolumes.agora_volume_xecx_sats,
            agora_volume_firma_sats: agoraVolumes.agora_volume_firma_sats,
            app_txs_count,
            tx_count_genesis_alp_token_type_standard:
                genesisTokenTypeTxs.tx_count_genesis_alp_token_type_standard,
            tx_count_genesis_slp_token_type_fungible:
                genesisTokenTypeTxs.tx_count_genesis_slp_token_type_fungible,
            tx_count_genesis_slp_token_type_mint_vault:
                genesisTokenTypeTxs.tx_count_genesis_slp_token_type_mint_vault,
            tx_count_genesis_slp_token_type_nft1_group:
                genesisTokenTypeTxs.tx_count_genesis_slp_token_type_nft1_group,
            tx_count_genesis_slp_token_type_nft1_child:
                genesisTokenTypeTxs.tx_count_genesis_slp_token_type_nft1_child,
        };
    }

    /**
     * Determine if a block needs transaction data for detailed metrics
     * This is the key optimization - only skip when absolutely safe
     */
    private needsTransactionData(blockInfo: any): boolean {
        const height = blockInfo.height;
        const numTxs = blockInfo.numTxs;

        // Only skip transaction fetching for early blocks (before eCash) with exactly 1 transaction
        // These are guaranteed to be just coinbase transactions
        if (height < FIRST_BLOCK_XEC && numTxs === 1) {
            return false;
        }

        // For all other blocks, we need transaction data to calculate metrics
        // Even blocks with 2-3 transactions might have interesting data
        return true;
    }

    /**
     * Count txs by token type for ALP and SLP
     */
    private countTokenTypeTxs(blockTxs: any[]): {
        tx_count_alp_token_type_standard: number;
        tx_count_slp_token_type_fungible: number;
        tx_count_slp_token_type_mint_vault: number;
        tx_count_slp_token_type_nft1_group: number;
        tx_count_slp_token_type_nft1_child: number;
    } {
        let tx_count_alp_token_type_standard = 0;
        let tx_count_slp_token_type_fungible = 0;
        let tx_count_slp_token_type_mint_vault = 0;
        let tx_count_slp_token_type_nft1_group = 0;
        let tx_count_slp_token_type_nft1_child = 0;
        for (const tx of blockTxs) {
            if (
                tx.tokenEntries &&
                tx.tokenEntries[0] &&
                tx.tokenEntries[0].tokenType &&
                typeof tx.tokenEntries[0].tokenType.type === 'string'
            ) {
                switch (tx.tokenEntries[0].tokenType.type) {
                    case 'ALP_TOKEN_TYPE_STANDARD':
                        tx_count_alp_token_type_standard++;
                        break;
                    case 'SLP_TOKEN_TYPE_FUNGIBLE':
                        tx_count_slp_token_type_fungible++;
                        break;
                    case 'SLP_TOKEN_TYPE_MINT_VAULT':
                        tx_count_slp_token_type_mint_vault++;
                        break;
                    case 'SLP_TOKEN_TYPE_NFT1_GROUP':
                        tx_count_slp_token_type_nft1_group++;
                        break;
                    case 'SLP_TOKEN_TYPE_NFT1_CHILD':
                        tx_count_slp_token_type_nft1_child++;
                        break;
                }
            }
        }
        return {
            tx_count_alp_token_type_standard,
            tx_count_slp_token_type_fungible,
            tx_count_slp_token_type_mint_vault,
            tx_count_slp_token_type_nft1_group,
            tx_count_slp_token_type_nft1_child,
        };
    }

    /**
     * Count app transactions (OP_RETURN txs that are not token txs)
     * An app tx is any tx that has an OP_RETURN output (outputScript starts with '6a')
     * that is NOT a token tx (tokenStatus === "TOKEN_STATUS_NON_TOKEN")
     */
    private countAppTxs(blockTxs: any[]): number {
        let appTxsCount = 0;
        for (const tx of blockTxs) {
            // Skip coinbase transactions
            if (tx.isCoinbase) continue;

            // Check if this is a non-token transaction
            if (tx.tokenStatus === 'TOKEN_STATUS_NON_TOKEN') {
                // Check if any output has an OP_RETURN script (starts with '6a')
                const hasOpReturnOutput =
                    tx.outputs?.some((output: any) => {
                        if (!output.outputScript) return false;
                        // Convert outputScript to hex if it's not already
                        const scriptHex =
                            typeof output.outputScript === 'string'
                                ? output.outputScript
                                : Buffer.from(output.outputScript).toString(
                                      'hex',
                                  );
                        return scriptHex.startsWith('6a');
                    }) || false;

                if (hasOpReturnOutput) {
                    appTxsCount++;
                }
            }
        }
        return appTxsCount;
    }

    /**
     * Count genesis txs by token type for ALP and SLP
     * A tx is a genesis tx if:
     * - tokenEntries length is >= 1
     * - tokenEntries[0].txType === "GENESIS"
     * - tokenEntries[0].isInvalid = false
     */
    private countGenesisTokenTypeTxs(blockTxs: any[]): {
        tx_count_genesis_alp_token_type_standard: number;
        tx_count_genesis_slp_token_type_fungible: number;
        tx_count_genesis_slp_token_type_mint_vault: number;
        tx_count_genesis_slp_token_type_nft1_group: number;
        tx_count_genesis_slp_token_type_nft1_child: number;
    } {
        let tx_count_genesis_alp_token_type_standard = 0;
        let tx_count_genesis_slp_token_type_fungible = 0;
        let tx_count_genesis_slp_token_type_mint_vault = 0;
        let tx_count_genesis_slp_token_type_nft1_group = 0;
        let tx_count_genesis_slp_token_type_nft1_child = 0;

        for (const tx of blockTxs) {
            // Check if this is a genesis transaction
            if (
                tx.tokenEntries &&
                tx.tokenEntries.length >= 1 &&
                tx.tokenEntries[0].txType === 'GENESIS' &&
                tx.tokenEntries[0].isInvalid === false &&
                tx.tokenEntries[0].tokenType &&
                typeof tx.tokenEntries[0].tokenType.type === 'string'
            ) {
                switch (tx.tokenEntries[0].tokenType.type) {
                    case 'ALP_TOKEN_TYPE_STANDARD':
                        tx_count_genesis_alp_token_type_standard++;
                        break;
                    case 'SLP_TOKEN_TYPE_FUNGIBLE':
                        tx_count_genesis_slp_token_type_fungible++;
                        break;
                    case 'SLP_TOKEN_TYPE_MINT_VAULT':
                        tx_count_genesis_slp_token_type_mint_vault++;
                        break;
                    case 'SLP_TOKEN_TYPE_NFT1_GROUP':
                        tx_count_genesis_slp_token_type_nft1_group++;
                        break;
                    case 'SLP_TOKEN_TYPE_NFT1_CHILD':
                        tx_count_genesis_slp_token_type_nft1_child++;
                        break;
                }
            }
        }

        return {
            tx_count_genesis_alp_token_type_standard,
            tx_count_genesis_slp_token_type_fungible,
            tx_count_genesis_slp_token_type_mint_vault,
            tx_count_genesis_slp_token_type_nft1_group,
            tx_count_genesis_slp_token_type_nft1_child,
        };
    }

    /**
     * Get blockchain info including current tip height
     */
    public async getBlockchainInfo(): Promise<any> {
        try {
            return await this.chronik.blockchainInfo();
        } catch (error) {
            logger.error('Failed to get blockchain info:', error);
            throw error;
        }
    }

    /**
     * Get current XEC price from CoinGecko
     */
    public async getCurrentXECPrice(): Promise<number | null> {
        try {
            const url = `${COINGECKO_API_BASE}/simple/price?ids=ecash&vs_currencies=usd`;
            const response = await fetch(url);

            if (!response.ok) {
                logger.error(
                    `CoinGecko HTTP ${response.status}: ${response.statusText}`,
                );
                return null;
            }

            const data = (await response.json()) as {
                ecash?: { usd?: number };
            };

            const price = data?.ecash?.usd;
            if (typeof price === 'number' && price > 0) {
                logger.info(
                    `Successfully fetched CoinGecko XEC price: $${price}`,
                );
                return price;
            }

            logger.error('Invalid price data from CoinGecko');
            return null;
        } catch (err) {
            logger.error('Error fetching CoinGecko price:', err);
            return null;
        }
    }
}

export default ChronikService;
