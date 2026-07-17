// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import DatabaseConnection from '../database/connection';
import { DatabaseConfig } from '../types';
import logger from '../utils/logger';
import { applyUtxoEventsBatch } from './utxoApply';
import { applyTokenUtxoEventsBatch } from './tokenApply';
import { UtxoEvent } from './utxoTypes';
import { TokenUtxoEvent } from './tokenTypes';
import { TokenBlockDelta } from './tokenBlockDeltas';

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
    unique_senders: number;
    fusion_tx_count: number;
    agora_unique_traders: number;
    lokad_tx_count: number;
    sender_scripts: string[];
    receiver_scripts: string[];
    coinbase_scripts: string[];
    agora_trader_scripts: string[];
    miner_scripts: string[];
    staker_scripts: string[];
    utxo_events: UtxoEvent[];
    token_utxo_events: TokenUtxoEvent[];
    token_block_deltas: TokenBlockDelta[];
}

const UNNEST_CHUNK_SIZE = 10000;

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

    /**
     * Upsert day_addresses role flags in chunks (no balance deltas — UTXO path).
     */
    private async upsertDayAddressesBulk(
        client: any,
        dates: string[],
        scripts: string[],
        isSenderArr: boolean[],
        isReceiverArr: boolean[],
        isCoinbaseRecipientArr: boolean[],
        isAgoraTraderArr: boolean[],
        isMinerArr: boolean[],
        isStakerArr: boolean[],
    ): Promise<void> {
        const n = scripts.length;
        for (let i = 0; i < n; i += UNNEST_CHUNK_SIZE) {
            const end = Math.min(i + UNNEST_CHUNK_SIZE, n);
            await client.query(
                `INSERT INTO day_addresses (date, output_script, is_sender, is_receiver, is_coinbase_recipient, is_agora_trader, is_miner, is_staker)
                 SELECT * FROM UNNEST($1::date[], $2::text[], $3::boolean[], $4::boolean[], $5::boolean[], $6::boolean[], $7::boolean[], $8::boolean[])
                 ON CONFLICT (date, output_script) DO UPDATE SET
                     is_sender = day_addresses.is_sender OR EXCLUDED.is_sender,
                     is_receiver = day_addresses.is_receiver OR EXCLUDED.is_receiver,
                     is_coinbase_recipient = day_addresses.is_coinbase_recipient OR EXCLUDED.is_coinbase_recipient,
                     is_agora_trader = day_addresses.is_agora_trader OR EXCLUDED.is_agora_trader,
                     is_miner = day_addresses.is_miner OR EXCLUDED.is_miner,
                     is_staker = day_addresses.is_staker OR EXCLUDED.is_staker`,
                [
                    dates.slice(i, end),
                    scripts.slice(i, end),
                    isSenderArr.slice(i, end),
                    isReceiverArr.slice(i, end),
                    isCoinbaseRecipientArr.slice(i, end),
                    isAgoraTraderArr.slice(i, end),
                    isMinerArr.slice(i, end),
                    isStakerArr.slice(i, end),
                ],
            );
        }
    }

    /**
     * Aggregate blocks → days for a calendar day without pruning day_addresses.
     * Use for the open tip day so DAU staging keeps accumulating across blocks.
     */
    async refreshDayAggregation(
        date: string,
        chronikService?: any,
    ): Promise<boolean> {
        return this.db.transaction(async (client: any) => {
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
                `day_finalize:${date}`,
            ]);

            const blockCount = await client.query(
                `SELECT COUNT(*)::int AS count FROM blocks
                 WHERE DATE(to_timestamp(timestamp)) = $1::date`,
                [date],
            );
            if ((blockCount.rows[0]?.count ?? 0) === 0) {
                return false;
            }

            await this.aggregateDailyData(date, chronikService, client);
            return true;
        });
    }

    /**
     * Finalize one completed calendar day: aggregate blocks → days and prune
     * DAU staging. Balances are already in `addresses` via per-block UTXO apply.
     * Do not call this for the open tip day — use refreshDayAggregation instead.
     */
    async processCompletedDay(
        date: string,
        chronikService?: any,
    ): Promise<boolean> {
        return this.db.transaction(async (client: any) => {
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
                `day_finalize:${date}`,
            ]);

            const blockCount = await client.query(
                `SELECT COUNT(*)::int AS count FROM blocks
                 WHERE DATE(to_timestamp(timestamp)) = $1::date`,
                [date],
            );
            if ((blockCount.rows[0]?.count ?? 0) === 0) {
                return false;
            }

            await this.aggregateDailyData(date, chronikService, client);
            await this.pruneDayAddresses(date, client);
            return true;
        });
    }

    async getCompletedStagingDates(
        includeTipDay: boolean = false,
    ): Promise<string[]> {
        try {
            const result = await this.db.query(
                `SELECT MIN(DATE(to_timestamp(timestamp)))::text AS min_date,
                        (SELECT DATE(to_timestamp(timestamp))::text
                         FROM blocks ORDER BY height DESC LIMIT 1) AS tip_date
                 FROM blocks`,
            );
            const minDate: string | null = result.rows[0]?.min_date;
            const tipDate: string | null = result.rows[0]?.tip_date;
            if (!minDate || !tipDate) {
                return [];
            }

            const series = await this.db.query(
                `SELECT d::date::text AS date
                 FROM generate_series(
                     $1::date,
                     ($2::date - CASE WHEN $3::boolean THEN 0 ELSE 1 END)::date,
                     '1 day'::interval
                 ) AS d
                 ORDER BY d`,
                [minDate, tipDate, includeTipDay],
            );
            return series.rows.map((row: { date: string }) => row.date);
        } catch (error) {
            logger.error('Error getting completed staging dates:', error);
            throw error;
        }
    }

    /**
     * Aggregate and prune every completed calendar day (no balance merge).
     * The open tip day is never pruned; with includeTipDay it is aggregated only.
     */
    async finalizeCompletedDays(
        chronikService?: any,
        options?: { includeTipDay?: boolean },
    ): Promise<string[]> {
        const includeTipDay = options?.includeTipDay ?? false;
        const dates = await this.getCompletedStagingDates(includeTipDay);
        const today = new Date().toISOString().split('T')[0];

        const tipDateResult = await this.db.query(
            `SELECT DATE(to_timestamp(timestamp))::text AS tip_date
             FROM blocks ORDER BY height DESC LIMIT 1`,
        );
        const tipDate: string | null = tipDateResult.rows[0]?.tip_date ?? null;

        const latestMergedResult = await this.db.query(
            'SELECT MAX(date)::text AS latest FROM days',
        );
        const latestMerged: string | null =
            latestMergedResult.rows[0]?.latest ?? null;

        const pendingDates =
            latestMerged === null
                ? dates
                : dates.filter(date => date > latestMerged);

        if (latestMerged !== null) {
            logger.info(
                `Resuming day finalization: through ${latestMerged} done — ${pendingDates.length.toLocaleString()} day(s) remaining`,
            );
        } else if (pendingDates.length > 0) {
            logger.info(
                `Finalizing ${pendingDates.length.toLocaleString()} calendar day(s)...`,
            );
        }

        const finalized: string[] = [];

        for (let i = 0; i < pendingDates.length; i++) {
            const date = pendingDates[i];
            if (!date) {
                continue;
            }

            // Tip day: refresh aggregation so charts stay current, but never prune
            // day_addresses while more tip blocks may still land.
            if (tipDate && date === tipDate) {
                if (includeTipDay) {
                    await this.refreshDayAggregation(date, chronikService);
                }
                continue;
            }

            if (today && date >= today) {
                continue;
            }
            const didFinalize = await this.processCompletedDay(
                date,
                chronikService,
            );
            if (didFinalize) {
                finalized.push(date);
            }
            if (
                finalized.length > 0 &&
                (finalized.length % 100 === 0 || i === pendingDates.length - 1)
            ) {
                logger.info(
                    `Day finalization progress: ${finalized.length.toLocaleString()} this run (through ${date})`,
                );
            }
        }

        return finalized;
    }

    /** @deprecated Use finalizeCompletedDays — no staging balance merge. */
    async mergeCompletedStagingDays(
        chronikService?: any,
        options?: { includeTipDay?: boolean },
    ): Promise<string[]> {
        return this.finalizeCompletedDays(chronikService, options);
    }

    async cancelActiveQuery(): Promise<void> {
        await this.db.cancelActiveQuery();
    }

    async acquireInstanceLock(): Promise<boolean> {
        return this.db.acquireInstanceLock();
    }

    async ensureInstanceLock(): Promise<boolean> {
        return this.db.ensureInstanceLock();
    }

    async releaseInstanceLock(): Promise<void> {
        await this.db.releaseInstanceLock();
    }

    async close(): Promise<void> {
        await this.db.close();
    }

    async saveBlock(block: Block): Promise<void> {
        await this.saveBlocks([block]);
    }

    private blockDateFromTimestamp(timestamp: number): string {
        return new Date(timestamp * 1000).toISOString().split('T')[0] ?? '';
    }

    /**
     * Save blocks + apply UTXO balance updates + DAU staging incrementally.
     * Optional hooks are for progress UI only (must stay cheap / non-blocking).
     */
    async saveBlocks(
        blocks: Block[],
        hooks?: {
            onBlockApplied?: () => void;
            onBeforeDbWrite?: () => void;
        },
    ): Promise<void> {
        if (blocks.length === 0) return;
        const onBlockApplied = hooks?.onBlockApplied;
        const onBeforeDbWrite = hooks?.onBeforeDbWrite;
        try {
            await this.db.transaction(async (client: any) => {
                // 1. Batch insert all blocks using UNNEST
                const heights: number[] = [];
                const hashes: string[] = [];
                const timestamps: number[] = [];
                const txCounts: number[] = [];
                const alpStandard: number[] = [];
                const slpFungible: number[] = [];
                const slpMintVault: number[] = [];
                const slpNft1Group: number[] = [];
                const slpNft1Child: number[] = [];
                const genesisAlpStandard: number[] = [];
                const genesisSlpFungible: number[] = [];
                const genesisSlpMintVault: number[] = [];
                const genesisSlpNft1Group: number[] = [];
                const genesisSlpNft1Child: number[] = [];
                const blockSizes: number[] = [];
                const sumCoinbase: (bigint | number)[] = [];
                const minerReward: (bigint | number)[] = [];
                const stakingReward: (bigint | number)[] = [];
                const ifpReward: (bigint | number)[] = [];
                const cachetClaims: number[] = [];
                const faucetClaims: number[] = [];
                const binanceCount: number[] = [];
                const binanceSats: (bigint | number)[] = [];
                const agoraVolume: (bigint | number)[] = [];
                const agoraXecx: (bigint | number)[] = [];
                const agoraFirma: (bigint | number)[] = [];
                const appTxs: number[] = [];
                const uniqueSenders: number[] = [];
                const fusionTxs: number[] = [];
                const agoraTraders: number[] = [];
                const lokadTxs: number[] = [];

                for (const block of blocks) {
                    heights.push(block.height);
                    hashes.push(block.hash);
                    timestamps.push(block.timestamp);
                    txCounts.push(block.tx_count);
                    alpStandard.push(block.tx_count_alp_token_type_standard);
                    slpFungible.push(block.tx_count_slp_token_type_fungible);
                    slpMintVault.push(block.tx_count_slp_token_type_mint_vault);
                    slpNft1Group.push(block.tx_count_slp_token_type_nft1_group);
                    slpNft1Child.push(block.tx_count_slp_token_type_nft1_child);
                    genesisAlpStandard.push(
                        block.tx_count_genesis_alp_token_type_standard,
                    );
                    genesisSlpFungible.push(
                        block.tx_count_genesis_slp_token_type_fungible,
                    );
                    genesisSlpMintVault.push(
                        block.tx_count_genesis_slp_token_type_mint_vault,
                    );
                    genesisSlpNft1Group.push(
                        block.tx_count_genesis_slp_token_type_nft1_group,
                    );
                    genesisSlpNft1Child.push(
                        block.tx_count_genesis_slp_token_type_nft1_child,
                    );
                    blockSizes.push(block.block_size);
                    sumCoinbase.push(block.sum_coinbase_output_sats);
                    minerReward.push(block.miner_reward_sats);
                    stakingReward.push(block.staking_reward_sats);
                    ifpReward.push(block.ifp_reward_sats);
                    cachetClaims.push(block.cachet_claim_count);
                    faucetClaims.push(block.cashtab_faucet_claim_count);
                    binanceCount.push(block.binance_withdrawal_count);
                    binanceSats.push(block.binance_withdrawal_sats);
                    agoraVolume.push(block.agora_volume_sats);
                    agoraXecx.push(block.agora_volume_xecx_sats);
                    agoraFirma.push(block.agora_volume_firma_sats);
                    appTxs.push(block.app_txs_count);
                    uniqueSenders.push(block.unique_senders);
                    fusionTxs.push(block.fusion_tx_count);
                    agoraTraders.push(block.agora_unique_traders);
                    lokadTxs.push(block.lokad_tx_count);
                }

                const insertResult = await client.query(
                    `INSERT INTO blocks (height, hash, timestamp, tx_count, tx_count_alp_token_type_standard, tx_count_slp_token_type_fungible, tx_count_slp_token_type_mint_vault, tx_count_slp_token_type_nft1_group, tx_count_slp_token_type_nft1_child, tx_count_genesis_alp_token_type_standard, tx_count_genesis_slp_token_type_fungible, tx_count_genesis_slp_token_type_mint_vault, tx_count_genesis_slp_token_type_nft1_group, tx_count_genesis_slp_token_type_nft1_child, block_size, sum_coinbase_output_sats, miner_reward_sats, staking_reward_sats, ifp_reward_sats, cachet_claim_count, cashtab_faucet_claim_count, binance_withdrawal_count, binance_withdrawal_sats, agora_volume_sats, agora_volume_xecx_sats, agora_volume_firma_sats, app_txs_count, unique_senders, fusion_tx_count, agora_unique_traders, lokad_tx_count)
                     SELECT * FROM UNNEST($1::integer[], $2::varchar[], $3::integer[], $4::integer[], $5::integer[], $6::integer[], $7::integer[], $8::integer[], $9::integer[], $10::integer[], $11::integer[], $12::integer[], $13::integer[], $14::integer[], $15::integer[], $16::bigint[], $17::bigint[], $18::bigint[], $19::bigint[], $20::integer[], $21::integer[], $22::integer[], $23::bigint[], $24::bigint[], $25::bigint[], $26::bigint[], $27::integer[], $28::integer[], $29::integer[], $30::integer[], $31::integer[])
                     ON CONFLICT (height) DO NOTHING
                     RETURNING height`,
                    [
                        heights,
                        hashes,
                        timestamps,
                        txCounts,
                        alpStandard,
                        slpFungible,
                        slpMintVault,
                        slpNft1Group,
                        slpNft1Child,
                        genesisAlpStandard,
                        genesisSlpFungible,
                        genesisSlpMintVault,
                        genesisSlpNft1Group,
                        genesisSlpNft1Child,
                        blockSizes,
                        sumCoinbase,
                        minerReward,
                        stakingReward,
                        ifpReward,
                        cachetClaims,
                        faucetClaims,
                        binanceCount,
                        binanceSats,
                        agoraVolume,
                        agoraXecx,
                        agoraFirma,
                        appTxs,
                        uniqueSenders,
                        fusionTxs,
                        agoraTraders,
                        lokadTxs,
                    ],
                );

                const insertedHeights = new Set<number>(
                    (insertResult.rows as Array<{ height: number }>).map(
                        r => r.height,
                    ),
                );

                const sortedBlocks = [...blocks].sort(
                    (a, b) => a.height - b.height,
                );

                const blocksToApply = sortedBlocks.filter(block =>
                    insertedHeights.has(block.height),
                );

                await applyUtxoEventsBatch(
                    client,
                    blocksToApply.map(block => ({
                        height: block.height,
                        date: this.blockDateFromTimestamp(block.timestamp),
                        events: block.utxo_events as UtxoEvent[],
                    })),
                    onBlockApplied,
                    onBeforeDbWrite,
                );

                // Progress already advanced once per applied block during UTXO
                // replay; remaining work is DB flush (label switched in onBeforeDbWrite).
                await applyTokenUtxoEventsBatch(
                    client,
                    blocksToApply.map(block => ({
                        height: block.height,
                        events: block.token_utxo_events as TokenUtxoEvent[],
                    })),
                );

                const allTokenDeltaHeights: number[] = [];
                const allTokenDeltaIds: string[] = [];
                const allGenesis: bigint[] = [];
                const allMint: bigint[] = [];
                const allBurn: bigint[] = [];
                for (const block of blocksToApply) {
                    for (const delta of block.token_block_deltas as TokenBlockDelta[]) {
                        allTokenDeltaHeights.push(block.height);
                        allTokenDeltaIds.push(delta.tokenId);
                        allGenesis.push(delta.genesisAtoms);
                        allMint.push(delta.mintAtoms);
                        allBurn.push(delta.burnAtoms);
                    }
                }
                if (allTokenDeltaHeights.length > 0) {
                    await client.query(
                        `INSERT INTO block_token_deltas (
                             height, token_id, genesis_atoms, mint_atoms, burn_atoms
                         )
                         SELECT * FROM UNNEST(
                             $1::integer[], $2::text[], $3::numeric[], $4::numeric[], $5::numeric[]
                         )
                         ON CONFLICT (height, token_id) DO UPDATE SET
                             genesis_atoms = EXCLUDED.genesis_atoms,
                             mint_atoms = EXCLUDED.mint_atoms,
                             burn_atoms = EXCLUDED.burn_atoms`,
                        [
                            allTokenDeltaHeights,
                            allTokenDeltaIds,
                            allGenesis.map(a => a.toString()),
                            allMint.map(a => a.toString()),
                            allBurn.map(a => a.toString()),
                        ],
                    );
                }

                const minerScripts = new Set<string>();
                const stakerScripts = new Set<string>();
                const coinbaseScripts = new Set<string>();
                for (const block of blocksToApply) {
                    for (const s of block.miner_scripts) {
                        minerScripts.add(s);
                    }
                    for (const s of block.staker_scripts) {
                        stakerScripts.add(s);
                    }
                    for (const s of block.coinbase_scripts) {
                        coinbaseScripts.add(s);
                    }
                }
                if (minerScripts.size > 0) {
                    await client.query(
                        'UPDATE addresses SET is_miner = TRUE WHERE output_script = ANY($1::text[])',
                        [[...minerScripts]],
                    );
                }
                if (stakerScripts.size > 0) {
                    await client.query(
                        'UPDATE addresses SET is_staker = TRUE WHERE output_script = ANY($1::text[])',
                        [[...stakerScripts]],
                    );
                }
                if (coinbaseScripts.size > 0) {
                    await client.query(
                        'UPDATE addresses SET is_coinbase_recipient = TRUE WHERE output_script = ANY($1::text[])',
                        [[...coinbaseScripts]],
                    );
                }

                for (const block of blocksToApply) {
                    await this.saveDayAddressesInTx(
                        client,
                        this.blockDateFromTimestamp(block.timestamp),
                        block.sender_scripts,
                        block.receiver_scripts,
                        block.coinbase_scripts,
                        block.agora_trader_scripts,
                        block.miner_scripts,
                        block.staker_scripts,
                    );
                }

                // ON CONFLICT skips still need progress ticks.
                for (const block of sortedBlocks) {
                    if (!insertedHeights.has(block.height)) {
                        onBlockApplied?.();
                    }
                }
            });
        } catch (error) {
            logger.error('Error saving blocks:', error);
            throw error;
        }
    }

    /**
     * Upsert day_addresses role flags for one block (no balance deltas).
     */
    private async saveDayAddressesInTx(
        client: any,
        date: string,
        senders: string[],
        receivers: string[],
        coinbaseRecipients: string[] = [],
        agoraTraders: string[] = [],
        miners: string[] = [],
        stakers: string[] = [],
    ): Promise<void> {
        const addressMap = new Map<
            string,
            {
                is_sender: boolean;
                is_receiver: boolean;
                is_coinbase_recipient: boolean;
                is_agora_trader: boolean;
                is_miner: boolean;
                is_staker: boolean;
            }
        >();

        const mergeFlag = (
            script: string,
            flags: Partial<{
                is_sender: boolean;
                is_receiver: boolean;
                is_coinbase_recipient: boolean;
                is_agora_trader: boolean;
                is_miner: boolean;
                is_staker: boolean;
            }>,
        ) => {
            const existing = addressMap.get(script);
            if (existing) {
                existing.is_sender = existing.is_sender || !!flags.is_sender;
                existing.is_receiver =
                    existing.is_receiver || !!flags.is_receiver;
                existing.is_coinbase_recipient =
                    existing.is_coinbase_recipient ||
                    !!flags.is_coinbase_recipient;
                existing.is_agora_trader =
                    existing.is_agora_trader || !!flags.is_agora_trader;
                existing.is_miner = existing.is_miner || !!flags.is_miner;
                existing.is_staker = existing.is_staker || !!flags.is_staker;
            } else {
                addressMap.set(script, {
                    is_sender: !!flags.is_sender,
                    is_receiver: !!flags.is_receiver,
                    is_coinbase_recipient: !!flags.is_coinbase_recipient,
                    is_agora_trader: !!flags.is_agora_trader,
                    is_miner: !!flags.is_miner,
                    is_staker: !!flags.is_staker,
                });
            }
        };

        for (const script of senders) {
            mergeFlag(script, { is_sender: true });
        }
        for (const script of receivers) {
            mergeFlag(script, { is_receiver: true });
        }
        for (const script of coinbaseRecipients) {
            mergeFlag(script, {
                is_receiver: true,
                is_coinbase_recipient: true,
            });
        }
        for (const script of agoraTraders) {
            mergeFlag(script, { is_agora_trader: true });
        }
        for (const script of miners) {
            mergeFlag(script, { is_miner: true });
        }
        for (const script of stakers) {
            mergeFlag(script, { is_staker: true });
        }

        if (addressMap.size === 0) {
            return;
        }

        const dates: string[] = [];
        const scripts: string[] = [];
        const isSenderArr: boolean[] = [];
        const isReceiverArr: boolean[] = [];
        const isCoinbaseRecipientArr: boolean[] = [];
        const isAgoraTraderArr: boolean[] = [];
        const isMinerArr: boolean[] = [];
        const isStakerArr: boolean[] = [];

        for (const [script, flags] of addressMap) {
            dates.push(date);
            scripts.push(script);
            isSenderArr.push(flags.is_sender);
            isReceiverArr.push(flags.is_receiver);
            isCoinbaseRecipientArr.push(flags.is_coinbase_recipient);
            isAgoraTraderArr.push(flags.is_agora_trader);
            isMinerArr.push(flags.is_miner);
            isStakerArr.push(flags.is_staker);
        }

        await this.upsertDayAddressesBulk(
            client,
            dates,
            scripts,
            isSenderArr,
            isReceiverArr,
            isCoinbaseRecipientArr,
            isAgoraTraderArr,
            isMinerArr,
            isStakerArr,
        );
    }

    /**
     * Prune day_addresses for a specific completed day.
     */
    async pruneDayAddresses(date: string, client?: any): Promise<void> {
        const db = client ?? this.db;
        try {
            const result = await db.query(
                'DELETE FROM day_addresses WHERE date = $1',
                [date],
            );
            if (result.rowCount && result.rowCount > 0) {
                logger.info(
                    `Pruned ${result.rowCount} rows from day_addresses for ${date}`,
                );
            }
        } catch (error) {
            logger.error('Error pruning day_addresses:', error);
            throw error;
        }
    }

    /**
     * Prune day_addresses for multiple completed days in a single query.
     */
    async pruneDayAddressesBatch(dates: string[]): Promise<void> {
        if (dates.length === 0) return;
        try {
            const result = await this.db.query(
                'DELETE FROM day_addresses WHERE date = ANY($1::date[])',
                [dates],
            );
            if (result.rowCount && result.rowCount > 0) {
                logger.info(
                    `Pruned ${result.rowCount} rows from day_addresses for ${dates.length} days`,
                );
            }
        } catch (error) {
            logger.error('Error pruning day_addresses batch:', error);
            throw error;
        }
    }

    /**
     * Get true daily active address counts from the day_addresses staging table.
     */
    async getDayActiveAddressCounts(
        date: string,
        client?: any,
    ): Promise<{
        daily_active_senders: number;
        daily_active_addresses: number;
        daily_agora_unique_traders: number;
        daily_unique_miners: number;
        daily_unique_stakers: number;
        new_miners_count: number;
        new_stakers_count: number;
        daily_coinbase_recipients: number;
    }> {
        const db = client ?? this.db;
        try {
            const sendersResult = await db.query(
                'SELECT COUNT(*) as count FROM day_addresses WHERE date = $1 AND is_sender = TRUE',
                [date],
            );
            const activeResult = await db.query(
                'SELECT COUNT(*) as count FROM day_addresses WHERE date = $1',
                [date],
            );
            const agoraResult = await db.query(
                'SELECT COUNT(*) as count FROM day_addresses WHERE date = $1 AND is_agora_trader = TRUE',
                [date],
            );
            const minersResult = await db.query(
                'SELECT COUNT(*) as count FROM day_addresses WHERE date = $1 AND is_miner = TRUE',
                [date],
            );
            const stakersResult = await db.query(
                'SELECT COUNT(*) as count FROM day_addresses WHERE date = $1 AND is_staker = TRUE',
                [date],
            );
            const newMinersResult = await db.query(
                'SELECT COUNT(*) as count FROM addresses WHERE is_miner = TRUE AND first_seen = $1',
                [date],
            );
            const newStakersResult = await db.query(
                'SELECT COUNT(*) as count FROM addresses WHERE is_staker = TRUE AND first_seen = $1',
                [date],
            );
            const coinbaseRecipientsResult = await db.query(
                'SELECT COUNT(*) as count FROM day_addresses WHERE date = $1 AND is_coinbase_recipient = TRUE',
                [date],
            );
            return {
                daily_active_senders: parseInt(
                    sendersResult.rows[0]?.count || '0',
                ),
                daily_active_addresses: parseInt(
                    activeResult.rows[0]?.count || '0',
                ),
                daily_agora_unique_traders: parseInt(
                    agoraResult.rows[0]?.count || '0',
                ),
                daily_unique_miners: parseInt(
                    minersResult.rows[0]?.count || '0',
                ),
                daily_unique_stakers: parseInt(
                    stakersResult.rows[0]?.count || '0',
                ),
                new_miners_count: parseInt(
                    newMinersResult.rows[0]?.count || '0',
                ),
                new_stakers_count: parseInt(
                    newStakersResult.rows[0]?.count || '0',
                ),
                daily_coinbase_recipients: parseInt(
                    coinbaseRecipientsResult.rows[0]?.count || '0',
                ),
            };
        } catch (error) {
            logger.error(
                `Error getting active address counts for ${date}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * Highest committed block height, or -1 when no blocks are indexed yet.
     *
     * Returns -1 for an empty table so callers can use tip + 1 as the
     * next height without skipping genesis or treating "only genesis" as empty.
     * Block rows are written atomically with their UTXO events, so this tip is
     * an exactly-once watermark for resume.
     */
    async getHighestBlockHeight(): Promise<number> {
        try {
            const result = await this.db.query(
                'SELECT MAX(height) as max_height FROM blocks',
            );
            const max = result.rows[0]?.max_height;
            return max === null || max === undefined ? -1 : Number(max);
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
                'SELECT height, hash, timestamp, tx_count, tx_count_alp_token_type_standard, tx_count_slp_token_type_fungible, tx_count_slp_token_type_mint_vault, tx_count_slp_token_type_nft1_group, tx_count_slp_token_type_nft1_child, tx_count_genesis_alp_token_type_standard, tx_count_genesis_slp_token_type_fungible, tx_count_genesis_slp_token_type_mint_vault, tx_count_genesis_slp_token_type_nft1_group, tx_count_genesis_slp_token_type_nft1_child, block_size, sum_coinbase_output_sats, miner_reward_sats, staking_reward_sats, ifp_reward_sats, cachet_claim_count, cashtab_faucet_claim_count, binance_withdrawal_count, binance_withdrawal_sats, agora_volume_sats, agora_volume_xecx_sats, agora_volume_firma_sats, app_txs_count, unique_senders, fusion_tx_count, agora_unique_traders, lokad_tx_count FROM blocks WHERE height BETWEEN $1 AND $2 ORDER BY height',
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

            // Migrate BEFORE running the schema: schema.sql reflects the desired
            // end state (including columns/indexes that existing tables may not
            // have yet). Running it first on an old DB would fail on index/DDL
            // that references not-yet-added columns, because CREATE TABLE IF NOT
            // EXISTS is a no-op on existing tables. The migration is guarded so
            // it is also safe on a fresh DB (tables don't exist yet).
            await this.migrateSchema();

            await this.db.query(schema);
            logger.info('Database tables initialized successfully');
        } catch (error) {
            logger.error('Error initializing database tables:', error);
            throw error;
        }
    }

    /**
     * Apply incremental schema changes to bring an existing database up to the
     * shape declared in schema.sql. No-op on a fresh database (guarded by
     * to_regclass so ALTERs are skipped when the tables don't exist yet).
     */
    async migrateSchema(): Promise<void> {
        await this.db.query(`
            DO $$
            BEGIN
                IF to_regclass('public.addresses') IS NOT NULL THEN
                    ALTER TABLE addresses
                        ADD COLUMN IF NOT EXISTS balance_sats BIGINT NOT NULL DEFAULT 0;
                END IF;
                IF to_regclass('public.blocks') IS NOT NULL THEN
                    ALTER TABLE blocks
                        ADD COLUMN IF NOT EXISTS unique_senders INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS fusion_tx_count INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS agora_unique_traders INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS lokad_tx_count INTEGER NOT NULL DEFAULT 0;
                END IF;
                IF to_regclass('public.days') IS NOT NULL THEN
                    ALTER TABLE days
                        ADD COLUMN IF NOT EXISTS unique_senders INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS fusion_tx_count INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS agora_unique_traders INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS lokad_tx_count INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS daily_active_senders INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS daily_active_addresses INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS daily_agora_unique_traders INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS daily_unique_miners INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS daily_unique_stakers INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS new_miners_count INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS new_stakers_count INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS daily_coinbase_recipients INTEGER NOT NULL DEFAULT 0,
                        ADD COLUMN IF NOT EXISTS new_addresses_count INTEGER NOT NULL DEFAULT 0;
                END IF;
            END $$;
        `);
        await this.db.query(`
            CREATE TABLE IF NOT EXISTS utxos (
                txid BYTEA NOT NULL,
                vout SMALLINT NOT NULL,
                output_script TEXT NOT NULL,
                sats BIGINT NOT NULL,
                created_height INTEGER NOT NULL,
                PRIMARY KEY (txid, vout)
            );
        `);
        await this.db.query(`
            CREATE INDEX IF NOT EXISTS idx_utxos_script ON utxos(output_script);
        `);
        await this.db.query(`
            CREATE INDEX IF NOT EXISTS idx_utxos_height ON utxos(created_height);
        `);
        await this.db.query(`
            DO $$
            BEGIN
                IF to_regclass('public.addresses') IS NOT NULL THEN
                    CREATE INDEX IF NOT EXISTS idx_addresses_balance
                        ON addresses (balance_sats DESC)
                        WHERE balance_sats > 0;
                END IF;
            END $$;
        `);
        await this.db.query(`
            CREATE TABLE IF NOT EXISTS token_utxos (
                txid BYTEA NOT NULL,
                vout SMALLINT NOT NULL,
                output_script TEXT NOT NULL,
                token_id TEXT NOT NULL,
                atoms NUMERIC(78, 0) NOT NULL,
                is_mint_baton BOOLEAN NOT NULL DEFAULT FALSE,
                token_protocol TEXT NOT NULL,
                token_type TEXT NOT NULL,
                created_height INTEGER NOT NULL,
                PRIMARY KEY (txid, vout)
            );
        `);
        await this.db.query(`
            CREATE INDEX IF NOT EXISTS idx_token_utxos_token ON token_utxos(token_id);
        `);
        await this.db.query(`
            CREATE INDEX IF NOT EXISTS idx_token_utxos_script ON token_utxos(output_script);
        `);
        await this.db.query(`
            CREATE TABLE IF NOT EXISTS token_balances (
                token_id TEXT NOT NULL,
                output_script TEXT NOT NULL,
                is_mint_baton BOOLEAN NOT NULL DEFAULT FALSE,
                token_protocol TEXT NOT NULL,
                token_type TEXT NOT NULL,
                atoms NUMERIC(78, 0) NOT NULL DEFAULT 0,
                PRIMARY KEY (token_id, output_script, is_mint_baton)
            );
        `);
        await this.db.query(`
            CREATE INDEX IF NOT EXISTS idx_token_balances_rich
                ON token_balances (token_id, atoms DESC)
                WHERE atoms > 0;
        `);
        await this.db.query(`
            CREATE TABLE IF NOT EXISTS tokens (
                token_id TEXT PRIMARY KEY,
                token_protocol TEXT NOT NULL,
                token_type TEXT NOT NULL,
                first_seen_height INTEGER NOT NULL
            );
        `);
        await this.db.query(`
            CREATE INDEX IF NOT EXISTS idx_tokens_protocol ON tokens(token_protocol, token_type);
        `);
        await this.db.query(`
            CREATE TABLE IF NOT EXISTS block_token_deltas (
                height INTEGER NOT NULL,
                token_id TEXT NOT NULL,
                genesis_atoms NUMERIC(78, 0) NOT NULL DEFAULT 0,
                mint_atoms NUMERIC(78, 0) NOT NULL DEFAULT 0,
                burn_atoms NUMERIC(78, 0) NOT NULL DEFAULT 0,
                PRIMARY KEY (height, token_id)
            );
        `);
        await this.db.query(`
            CREATE INDEX IF NOT EXISTS idx_block_token_deltas_token ON block_token_deltas(token_id);
        `);
        // SLP/ALP atom amounts are uint64-ranged; PG bigint is signed int64 only.
        await this.db.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'token_utxos'
                      AND column_name = 'atoms' AND data_type = 'bigint'
                ) THEN
                    ALTER TABLE token_utxos
                        ALTER COLUMN atoms TYPE NUMERIC(78, 0) USING atoms::numeric;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'token_balances'
                      AND column_name = 'atoms' AND data_type = 'bigint'
                ) THEN
                    ALTER TABLE token_balances
                        ALTER COLUMN atoms TYPE NUMERIC(78, 0) USING atoms::numeric;
                END IF;
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'block_token_deltas'
                      AND column_name = 'genesis_atoms' AND data_type = 'bigint'
                ) THEN
                    ALTER TABLE block_token_deltas
                        ALTER COLUMN genesis_atoms TYPE NUMERIC(78, 0)
                            USING genesis_atoms::numeric,
                        ALTER COLUMN mint_atoms TYPE NUMERIC(78, 0)
                            USING mint_atoms::numeric,
                        ALTER COLUMN burn_atoms TYPE NUMERIC(78, 0)
                            USING burn_atoms::numeric;
                END IF;
            END $$;
        `);
    }

    /**
     * Clear UTXO set, addresses, and DAU staging before a full reindex.
     */
    async resetAddressBalancesForReindex(): Promise<void> {
        await this.db.query(
            'TRUNCATE TABLE utxos, addresses, day_addresses, token_utxos, token_balances, tokens, block_token_deltas',
        );
        logger.info(
            'Cleared utxos, addresses, day_addresses, and token tables for reindex',
        );
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
        client?: any,
    ): Promise<void> {
        const db = client ?? this.db;
        try {
            // Check if this day already exists
            const existingDay = await this.getDayByDate(date, client);
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
                    tx_count_genesis_slp_token_type_nft1_child, price_usd,
                    unique_senders, fusion_tx_count, agora_unique_traders, lokad_tx_count,
                    daily_active_senders, daily_active_addresses, daily_agora_unique_traders, daily_unique_miners, daily_unique_stakers, new_miners_count, new_stakers_count, daily_coinbase_recipients, new_addresses_count
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
                    $2 as price_usd,
                    SUM(unique_senders) as unique_senders,
                    SUM(fusion_tx_count) as fusion_tx_count,
                    SUM(agora_unique_traders) as agora_unique_traders,
                    SUM(lokad_tx_count) as lokad_tx_count,
                    $3 as daily_active_senders,
                    $4 as daily_active_addresses,
                    $5 as daily_agora_unique_traders,
                    $6 as daily_unique_miners,
                    $7 as daily_unique_stakers,
                    $8 as new_miners_count,
                    $9 as new_stakers_count,
                    $10 as daily_coinbase_recipients,
                    $11 as new_addresses_count
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
                    tx_count_genesis_slp_token_type_nft1_child = EXCLUDED.tx_count_genesis_slp_token_type_nft1_child,
                    unique_senders = EXCLUDED.unique_senders,
                    fusion_tx_count = EXCLUDED.fusion_tx_count,
                    agora_unique_traders = EXCLUDED.agora_unique_traders,
                    lokad_tx_count = EXCLUDED.lokad_tx_count,
                    daily_active_senders = EXCLUDED.daily_active_senders,
                    daily_active_addresses = EXCLUDED.daily_active_addresses,
                    daily_agora_unique_traders = EXCLUDED.daily_agora_unique_traders,
                    daily_unique_miners = EXCLUDED.daily_unique_miners,
                    daily_unique_stakers = EXCLUDED.daily_unique_stakers,
                    new_miners_count = EXCLUDED.new_miners_count,
                    new_stakers_count = EXCLUDED.new_stakers_count,
                    daily_coinbase_recipients = EXCLUDED.daily_coinbase_recipients,
                    new_addresses_count = EXCLUDED.new_addresses_count
                    -- price_usd is NOT updated on conflict
            `;

            // Get true DAU counts from day_addresses staging table
            const dauCounts = await this.getDayActiveAddressCounts(
                date,
                client,
            );

            // Count addresses first seen on this day
            const newAddrsResult = await db.query(
                'SELECT COUNT(*) as count FROM addresses WHERE first_seen = $1',
                [date],
            );
            const newAddressesCount = parseInt(
                newAddrsResult.rows[0]?.count || '0',
            );

            await db.query(query, [
                date,
                currentPrice,
                dauCounts.daily_active_senders,
                dauCounts.daily_active_addresses,
                dauCounts.daily_agora_unique_traders,
                dauCounts.daily_unique_miners,
                dauCounts.daily_unique_stakers,
                dauCounts.new_miners_count,
                dauCounts.new_stakers_count,
                dauCounts.daily_coinbase_recipients,
                newAddressesCount,
            ]);

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
    async getDayByDate(date: string, client?: any): Promise<any | null> {
        const db = client ?? this.db;
        try {
            const result = await db.query(
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
