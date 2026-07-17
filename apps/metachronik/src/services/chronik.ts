// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { ChronikClient, ConnectionStrategy } from 'chronik-client';
import { ChronikConfig, BlockData } from '../types';
import logger from '../utils/logger';
import {
    txUsesFusionProtocol,
    txUsesLokadProtocol,
} from '../utils/opReturnProtocols';
import { UtxoEvent } from './utxoTypes';
import {
    collectUtxoEventsFromBlockTxs,
    rawScriptHex,
} from './emptyScriptUtxos';
import { TokenUtxoEvent } from './tokenTypes';
import { TokenBlockDelta } from './tokenBlockDeltas';
import { collectTokenBlockDeltas } from './tokenBlockDeltas';

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
        // Errors propagate to the caller intentionally. On a Chronik outage
        // this runs for every block in a batch concurrently, so logging (or
        // catching) per call would flood the output with hundreds of identical
        // stack traces; the batch processor logs one concise summary instead.

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
     * Identify coinbase output scripts that receive miner vs staker rewards.
     * Miner outputs = everything that isn't IFP or staking.
     * Staker output = the output matching the staking reward heuristic.
     */
    private collectCoinbaseRewardRecipients(
        height: number,
        coinbaseOutputs: any[],
    ): { miner_scripts: string[]; staker_scripts: string[] } {
        const sum_coinbase_output_sats = coinbaseOutputs.reduce(
            (sum, output) => sum + BigInt(output.sats),
            0n,
        );

        const ifpOutputScript =
            height >= IFP_ACTIVATION_HEIGHT
                ? height >= IFP_OUTPUTSCRIPT_CHANGE_HEIGHT
                    ? IFP_OUTPUTSCRIPT_NEW
                    : IFP_OUTPUTSCRIPT_OLD
                : null;

        let stakerScript: string | null = null;

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
                const outputScript =
                    typeof output.outputScript === 'string'
                        ? output.outputScript
                        : Buffer.from(output.outputScript).toString('hex');

                if (ifpOutputScript && outputScript === ifpOutputScript) {
                    continue;
                }

                if (
                    outputSats >= minStakerValue &&
                    outputSats <= assumedMaxStakerValue
                ) {
                    stakerScript = outputScript;
                    break;
                }
            }
        }

        const minerScripts = new Set<string>();
        const stakerScripts = new Set<string>();

        for (const output of coinbaseOutputs) {
            const outputScript =
                typeof output.outputScript === 'string'
                    ? output.outputScript
                    : Buffer.from(output.outputScript).toString('hex');

            if (outputScript.startsWith('6a')) continue;
            if (ifpOutputScript && outputScript === ifpOutputScript) continue;

            if (stakerScript && outputScript === stakerScript) {
                stakerScripts.add(outputScript);
            } else {
                minerScripts.add(outputScript);
            }
        }

        return {
            miner_scripts: Array.from(minerScripts),
            staker_scripts: Array.from(stakerScripts),
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
            blockInfo.height == null ||
            !blockInfo.hash ||
            !blockInfo.timestamp ||
            blockInfo.numTxs === undefined
        ) {
            logger.error(
                'Invalid block info structure:',
                JSON.stringify(
                    chronikBlock,
                    (_, v) => (typeof v === 'bigint' ? v.toString() : v),
                    2,
                ),
            );
            throw new Error('Invalid block info structure');
        }

        // Always fetch full transaction data. metachronik's purpose is accurate
        // data: skipping tx fetches for early 1-tx blocks would drop real
        // coinbase recipients (e.g. never-moved dormant holders) from balance
        // tracking, and only saves a round-trip for a tiny 1-tx payload.
        const allBlockTxs: any[] = await this.getAllBlockTxs(
            blockInfo.height,
            blockInfo.numTxs,
        );
        const coinbaseTx = allBlockTxs[0]; // Coinbase tx is always first

        if (!coinbaseTx || !coinbaseTx.outputs) {
            logger.error(
                `No coinbase transaction found for block ${blockInfo.height}`,
            );
            throw new Error('No coinbase transaction found');
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
        let unique_senders = 0;
        let fusion_tx_count = 0;
        let agora_unique_traders = 0;
        let lokad_tx_count = 0;
        let sender_scripts: string[] = [];
        let receiver_scripts: string[] = [];
        let coinbase_scripts: string[] = [];
        let agora_trader_scripts: string[] = [];
        let miner_scripts: string[] = [];
        let staker_scripts: string[] = [];
        let utxo_events: UtxoEvent[] = [];
        let token_utxo_events: TokenUtxoEvent[] = [];
        let token_block_deltas: TokenBlockDelta[] = [];

        utxo_events = this.collectUtxoEvents(allBlockTxs);
        token_utxo_events = this.collectTokenUtxoEvents(allBlockTxs);
        token_block_deltas = collectTokenBlockDeltas(allBlockTxs);

        // Only calculate detailed metrics for blocks with more than a coinbase
        if (allBlockTxs.length > 1) {
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

            // Collect unique address sets for true DAU calculation
            sender_scripts = this.collectUniqueSenders(allBlockTxs);
            receiver_scripts = this.collectUniqueReceivers(allBlockTxs);
            coinbase_scripts = this.collectCoinbaseRecipients(allBlockTxs);
            const rewardRecipients = this.collectCoinbaseRewardRecipients(
                Number(blockInfo.height),
                coinbaseTx.outputs,
            );
            miner_scripts = rewardRecipients.miner_scripts;
            staker_scripts = rewardRecipients.staker_scripts;
            unique_senders = sender_scripts.length;

            // New metrics
            fusion_tx_count = this.countFusionTxs(allBlockTxs);
            agora_trader_scripts = this.collectAgoraTraders(allBlockTxs);
            agora_unique_traders = agora_trader_scripts.length;
            lokad_tx_count = this.countLokadTxs(allBlockTxs);
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
            unique_senders,
            fusion_tx_count,
            agora_unique_traders,
            lokad_tx_count,
            sender_scripts,
            receiver_scripts,
            coinbase_scripts,
            agora_trader_scripts,
            miner_scripts,
            staker_scripts,
            utxo_events,
            token_utxo_events,
            token_block_deltas,
        };
    }

    /**
     * Ordered UTXO creates and spends for a block (explorer-style).
     * Processes txs in block order; within each tx, inputs then outputs.
     */
    private collectUtxoEvents(blockTxs: any[]): UtxoEvent[] {
        return collectUtxoEventsFromBlockTxs(blockTxs);
    }

    /**
     * Ordered token creates/spends for a block.
     * Only inputs/outputs with Chronik `token` coloring are included.
     * Creates before spends (CTOR may list child txs before parents).
     */
    private collectTokenUtxoEvents(blockTxs: any[]): TokenUtxoEvent[] {
        const creates: TokenUtxoEvent[] = [];
        const spends: TokenUtxoEvent[] = [];

        for (const tx of blockTxs) {
            const txid =
                typeof tx.txid === 'string'
                    ? tx.txid
                    : Buffer.from(tx.txid).toString('hex');

            if (!tx.isCoinbase && tx.inputs) {
                for (const input of tx.inputs) {
                    if (!input.prevOut || !input.token) {
                        continue;
                    }
                    const prevTxid =
                        typeof input.prevOut.txid === 'string'
                            ? input.prevOut.txid
                            : Buffer.from(input.prevOut.txid).toString('hex');
                    spends.push({
                        type: 'spend',
                        prevTxid,
                        prevVout: Number(input.prevOut.outIdx),
                    });
                }
            }

            if (tx.outputs) {
                let vout = 0;
                for (const output of tx.outputs) {
                    if (output.token) {
                        const script = this.normalizeScriptHex(
                            output.outputScript,
                        );
                        if (script) {
                            const { protocol, type } = this.tokenTypeFields(
                                output.token,
                            );
                            creates.push({
                                type: 'create',
                                txid,
                                vout,
                                script,
                                tokenId: output.token.tokenId,
                                atoms: BigInt(output.token.atoms ?? 0),
                                isMintBaton: Boolean(output.token.isMintBaton),
                                tokenProtocol: protocol,
                                tokenType: type,
                            });
                        }
                    }
                    vout++;
                }
            }
        }

        return [...creates, ...spends];
    }

    private tokenTypeFields(token: {
        tokenType?: { protocol?: string; type?: string };
    }): { protocol: string; type: string } {
        const protocol = token.tokenType?.protocol ?? 'UNKNOWN';
        const type = token.tokenType?.type ?? 'UNKNOWN';
        return { protocol, type };
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
     * Count unique sending addresses in block transactions.
     * A "sender" is identified by the outputScript of the first input of each tx.
     */
    private countUniqueSenders(blockTxs: any[]): number {
        const senders = new Set<string>();
        for (const tx of blockTxs) {
            if (tx.isCoinbase) continue;
            if (!tx.inputs) continue;
            for (const input of tx.inputs) {
                if (input.outputScript) {
                    senders.add(input.outputScript);
                }
            }
        }
        return senders.size;
    }

    /**
     * Normalize an output script to lowercase hex, skipping OP_RETURN.
     */
    private rawScriptHex(
        outputScript: string | Uint8Array | undefined,
    ): string {
        return rawScriptHex(outputScript);
    }

    private normalizeScriptHex(
        outputScript: string | Uint8Array | undefined,
    ): string | null {
        const scriptHex = this.rawScriptHex(outputScript);
        if (scriptHex === '') {
            return null;
        }
        if (scriptHex.startsWith('6a')) {
            return null;
        }
        return scriptHex;
    }

    /**
     * @deprecated Replaced by collectUtxoEvents for incremental UTXO indexing.
     */
    private collectBalanceDeltas(blockTxs: any[]): Array<{
        script: string;
        received_sats: bigint;
        sent_sats: bigint;
    }> {
        const deltas = new Map<string, { received: bigint; sent: bigint }>();

        const addReceived = (script: string, sats: bigint) => {
            const existing = deltas.get(script) ?? { received: 0n, sent: 0n };
            existing.received += sats;
            deltas.set(script, existing);
        };

        const addSent = (script: string, sats: bigint) => {
            const existing = deltas.get(script) ?? { received: 0n, sent: 0n };
            existing.sent += sats;
            deltas.set(script, existing);
        };

        for (const tx of blockTxs) {
            if (tx.outputs) {
                for (const output of tx.outputs) {
                    const script = this.normalizeScriptHex(output.outputScript);
                    if (!script) {
                        continue;
                    }
                    addReceived(script, BigInt(output.sats ?? 0));
                }
            }

            if (tx.isCoinbase || !tx.inputs) {
                continue;
            }

            for (const input of tx.inputs) {
                const script = this.normalizeScriptHex(input.outputScript);
                if (!script) {
                    continue;
                }
                addSent(script, BigInt(input.sats ?? 0));
            }
        }

        return Array.from(deltas.entries()).map(
            ([script, { received, sent }]) => ({
                script,
                received_sats: received,
                sent_sats: sent,
            }),
        );
    }

    /**
     * Collect unique sender outputScripts for true DAU deduplication.
     * Includes all input addresses, not just the first input.
     */
    private collectUniqueSenders(blockTxs: any[]): string[] {
        const senders = new Set<string>();
        for (const tx of blockTxs) {
            if (tx.isCoinbase) continue;
            if (!tx.inputs) continue;
            for (const input of tx.inputs) {
                if (input.outputScript) {
                    senders.add(input.outputScript);
                }
            }
        }
        return Array.from(senders);
    }

    /**
     * Collect unique receiver outputScripts for true DAU deduplication.
     * A "receiver" is any non-OP_RETURN output address.
     */
    private collectUniqueReceivers(blockTxs: any[]): string[] {
        const receivers = new Set<string>();
        for (const tx of blockTxs) {
            if (tx.isCoinbase) continue;
            if (!tx.outputs) continue;
            for (const output of tx.outputs) {
                if (!output.outputScript) continue;
                const scriptHex =
                    typeof output.outputScript === 'string'
                        ? output.outputScript
                        : Buffer.from(output.outputScript).toString('hex');
                if (scriptHex.startsWith('6a')) continue;
                receivers.add(scriptHex);
            }
        }
        return Array.from(receivers);
    }

    /**
     * Collect unique coinbase output recipients (miners, stakers, IFP).
     */
    private collectCoinbaseRecipients(blockTxs: any[]): string[] {
        const recipients = new Set<string>();
        for (const tx of blockTxs) {
            if (!tx.isCoinbase) continue;
            if (!tx.outputs) continue;
            for (const output of tx.outputs) {
                if (!output.outputScript) continue;
                const scriptHex =
                    typeof output.outputScript === 'string'
                        ? output.outputScript
                        : Buffer.from(output.outputScript).toString('hex');
                if (scriptHex.startsWith('6a')) continue;
                recipients.add(scriptHex);
            }
        }
        return Array.from(recipients);
    }

    /**
     * Count CashFusion transactions in a block.
     * Detects FUZ LOKAD ID (46555a00) in legacy OP_RETURN or eMPP fragments.
     */
    private countFusionTxs(blockTxs: any[]): number {
        let count = 0;
        for (const tx of blockTxs) {
            if (tx.isCoinbase) continue;
            if (txUsesFusionProtocol(tx)) {
                count++;
            }
        }
        return count;
    }

    /**
     * Count unique Agora traders (buyer addresses) in block transactions.
     * A trader is the address that initiates an Agora BUY transaction.
     */
    private countAgoraUniqueTraders(blockTxs: any[]): number {
        const traders = new Set<string>();
        for (const tx of blockTxs) {
            if (tx.isCoinbase) continue;
            const volume = this.parseAgoraBuyVolume(tx);
            if (volume !== undefined) {
                // Buyer: first non-Agora P2PKH input
                if (tx.inputs && tx.inputs.length > 0) {
                    for (const input of tx.inputs) {
                        if (
                            !this.isAgoraPartialInputOrOutput(input) &&
                            input.outputScript
                        ) {
                            const script =
                                typeof input.outputScript === 'string'
                                    ? input.outputScript
                                    : Buffer.from(input.outputScript).toString(
                                          'hex',
                                      );
                            if (script.startsWith('76a914')) {
                                traders.add(script);
                            }
                            break;
                        }
                    }
                }
                // Seller: outputs[1] is the maker's payment address
                if (tx.outputs && tx.outputs.length > 1) {
                    const sellerOutput = tx.outputs[1];
                    if (sellerOutput.outputScript) {
                        const script =
                            typeof sellerOutput.outputScript === 'string'
                                ? sellerOutput.outputScript
                                : Buffer.from(
                                      sellerOutput.outputScript,
                                  ).toString('hex');
                        if (script.startsWith('76a914')) {
                            traders.add(script);
                        }
                    }
                }
            }
        }
        return traders.size;
    }

    /**
     * Collect unique Agora trader outputScripts for true daily deduplication.
     * Traders = buyers (non-P2SH inputs) + sellers (outputs[1] of BUY txs).
     * Only P2PKH addresses are included — P2SH scripts are Agora offer contracts.
     */
    private collectAgoraTraders(blockTxs: any[]): string[] {
        const traders = new Set<string>();
        for (const tx of blockTxs) {
            if (tx.isCoinbase) continue;
            const volume = this.parseAgoraBuyVolume(tx);
            if (volume !== undefined) {
                // Buyer: first non-Agora P2PKH input
                if (tx.inputs && tx.inputs.length > 0) {
                    for (const input of tx.inputs) {
                        if (
                            !this.isAgoraPartialInputOrOutput(input) &&
                            input.outputScript
                        ) {
                            const script =
                                typeof input.outputScript === 'string'
                                    ? input.outputScript
                                    : Buffer.from(input.outputScript).toString(
                                          'hex',
                                      );
                            if (script.startsWith('76a914')) {
                                traders.add(script);
                            }
                            break;
                        }
                    }
                }
                // Seller: outputs[1] is the maker's payment address
                if (tx.outputs && tx.outputs.length > 1) {
                    const sellerOutput = tx.outputs[1];
                    if (sellerOutput.outputScript) {
                        const script =
                            typeof sellerOutput.outputScript === 'string'
                                ? sellerOutput.outputScript
                                : Buffer.from(
                                      sellerOutput.outputScript,
                                  ).toString('hex');
                        if (script.startsWith('76a914')) {
                            traders.add(script);
                        }
                    }
                }
            }
        }
        return Array.from(traders);
    }

    /**
     * Count transactions using a LOKAD protocol identifier.
     * Supports legacy OP_RETURN (6a04...) and eMPP (6a50...) encodings.
     */
    private countLokadTxs(blockTxs: any[]): number {
        let count = 0;
        for (const tx of blockTxs) {
            if (tx.isCoinbase) continue;
            if (txUsesLokadProtocol(tx)) {
                count++;
            }
        }
        return count;
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
