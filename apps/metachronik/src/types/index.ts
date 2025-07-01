// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
export interface ChartData {
    timestamp: number;
    value: number;
    label?: string;
}

export interface DailyStats {
    date: string;
    total_blocks: number;
    total_transactions: number;
    avg_block_size: number;
}

export interface BlockData {
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

export interface DayData {
    date: string;
    total_blocks: number;
    total_transactions: number;
    avg_block_size: number;
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
    price_usd: number | null;
}

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export interface ChronikConfig {
    urls: string[];
    connectionStrategy: 'closestFirst' | 'asOrdered';
}

export interface IndexingConfig {
    batchSize: number;
    maxConcurrentBatches: number;
    targetTxCountPerBatch: number;
}

export interface AppConfig {
    database: DatabaseConfig;
    chronik: ChronikConfig;
    cronSchedule: string;
    logLevel: string;
    indexing: IndexingConfig;
}
