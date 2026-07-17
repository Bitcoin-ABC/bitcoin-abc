-- Chronik Charts Database Schema
-- Blocks table for individual block data
-- Days table for daily aggregated chart data

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    height INTEGER PRIMARY KEY,
    hash VARCHAR(64) NOT NULL UNIQUE,
    timestamp INTEGER NOT NULL,
    tx_count INTEGER NOT NULL,
    tx_count_alp_token_type_standard INTEGER NOT NULL,   
    tx_count_slp_token_type_fungible INTEGER NOT NULL,    
    tx_count_slp_token_type_mint_vault INTEGER NOT NULL,    
    tx_count_slp_token_type_nft1_group INTEGER NOT NULL,    
    tx_count_slp_token_type_nft1_child INTEGER NOT NULL,
    tx_count_genesis_alp_token_type_standard INTEGER NOT NULL,
    tx_count_genesis_slp_token_type_fungible INTEGER NOT NULL,
    tx_count_genesis_slp_token_type_mint_vault INTEGER NOT NULL,
    tx_count_genesis_slp_token_type_nft1_group INTEGER NOT NULL,
    tx_count_genesis_slp_token_type_nft1_child INTEGER NOT NULL,
    block_size INTEGER NOT NULL,
    sum_coinbase_output_sats BIGINT NOT NULL,
    miner_reward_sats BIGINT NOT NULL,
    staking_reward_sats BIGINT NOT NULL,
    ifp_reward_sats BIGINT NOT NULL,
    cachet_claim_count INTEGER NOT NULL,
    cashtab_faucet_claim_count INTEGER NOT NULL,
    binance_withdrawal_count INTEGER NOT NULL,
    binance_withdrawal_sats BIGINT NOT NULL,
    agora_volume_sats BIGINT NOT NULL,
    agora_volume_xecx_sats BIGINT NOT NULL,
    agora_volume_firma_sats BIGINT NOT NULL,
    app_txs_count INTEGER NOT NULL,
    unique_senders INTEGER NOT NULL DEFAULT 0,
    fusion_tx_count INTEGER NOT NULL DEFAULT 0,
    agora_unique_traders INTEGER NOT NULL DEFAULT 0,
    lokad_tx_count INTEGER NOT NULL DEFAULT 0
);

-- Days table for daily aggregated chart data
CREATE TABLE IF NOT EXISTS days (
    date DATE PRIMARY KEY,
    total_blocks INTEGER NOT NULL,
    total_transactions INTEGER NOT NULL,
    avg_block_size DECIMAL(12, 2) NOT NULL,
    sum_coinbase_output_sats BIGINT NOT NULL,
    miner_reward_sats BIGINT NOT NULL,
    staking_reward_sats BIGINT NOT NULL,
    ifp_reward_sats BIGINT NOT NULL,
    cachet_claim_count INTEGER NOT NULL,
    cashtab_faucet_claim_count INTEGER NOT NULL,
    binance_withdrawal_count INTEGER NOT NULL,
    binance_withdrawal_sats BIGINT NOT NULL,
    agora_volume_sats BIGINT NOT NULL,
    agora_volume_xecx_sats BIGINT NOT NULL,
    agora_volume_firma_sats BIGINT NOT NULL,
    app_txs_count INTEGER NOT NULL,
    tx_count_alp_token_type_standard INTEGER NOT NULL,
    tx_count_slp_token_type_fungible INTEGER NOT NULL,
    tx_count_slp_token_type_mint_vault INTEGER NOT NULL,
    tx_count_slp_token_type_nft1_group INTEGER NOT NULL,
    tx_count_slp_token_type_nft1_child INTEGER NOT NULL,
    tx_count_genesis_alp_token_type_standard INTEGER NOT NULL,
    tx_count_genesis_slp_token_type_fungible INTEGER NOT NULL,
    tx_count_genesis_slp_token_type_mint_vault INTEGER NOT NULL,
    tx_count_genesis_slp_token_type_nft1_group INTEGER NOT NULL,
    tx_count_genesis_slp_token_type_nft1_child INTEGER NOT NULL,
    price_usd DECIMAL(12, 8),
    unique_senders INTEGER NOT NULL DEFAULT 0,
    fusion_tx_count INTEGER NOT NULL DEFAULT 0,
    agora_unique_traders INTEGER NOT NULL DEFAULT 0,
    lokad_tx_count INTEGER NOT NULL DEFAULT 0,
    daily_active_senders INTEGER NOT NULL DEFAULT 0,
    daily_active_addresses INTEGER NOT NULL DEFAULT 0,
    daily_agora_unique_traders INTEGER NOT NULL DEFAULT 0,
    daily_unique_miners INTEGER NOT NULL DEFAULT 0,
    daily_unique_stakers INTEGER NOT NULL DEFAULT 0,
    new_miners_count INTEGER NOT NULL DEFAULT 0,
    new_stakers_count INTEGER NOT NULL DEFAULT 0,
    daily_coinbase_recipients INTEGER NOT NULL DEFAULT 0,
    new_addresses_count INTEGER NOT NULL DEFAULT 0,
    -- Generated columns for USD volume calculated at the time of each day
    -- Convert sats to XEC (divide by 100), then multiply by price to get USD
    agora_volume_firma_usd DECIMAL(20, 2) GENERATED ALWAYS AS (
        (agora_volume_firma_sats / 100.0) * COALESCE(price_usd, 0)
    ) STORED,
    agora_volume_xecx_usd DECIMAL(20, 2) GENERATED ALWAYS AS (
        (agora_volume_xecx_sats / 100.0) * COALESCE(price_usd, 0)
    ) STORED,
    agora_volume_usd DECIMAL(20, 2) GENERATED ALWAYS AS (
        (agora_volume_sats / 100.0) * COALESCE(price_usd, 0)
    ) STORED
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);
CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);
CREATE INDEX IF NOT EXISTS idx_days_price ON days(price_usd) WHERE price_usd IS NOT NULL;

-- Staging table for true daily active address deduplication (role flags only).
-- Balance tracking uses the utxos + addresses tables incrementally per block.
CREATE TABLE IF NOT EXISTS day_addresses (
    date DATE NOT NULL,
    output_script TEXT NOT NULL,
    is_sender BOOLEAN NOT NULL DEFAULT FALSE,
    is_receiver BOOLEAN NOT NULL DEFAULT FALSE,
    is_coinbase_recipient BOOLEAN NOT NULL DEFAULT FALSE,
    is_agora_trader BOOLEAN NOT NULL DEFAULT FALSE,
    is_miner BOOLEAN NOT NULL DEFAULT FALSE,
    is_staker BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (date, output_script)
);
CREATE INDEX IF NOT EXISTS idx_day_addresses_date ON day_addresses(date);

-- Unspent transaction outputs at chain tip (incremental UTXO set).
CREATE TABLE IF NOT EXISTS utxos (
    txid BYTEA NOT NULL,
    vout SMALLINT NOT NULL,
    output_script TEXT NOT NULL,
    sats BIGINT NOT NULL,
    created_height INTEGER NOT NULL,
    PRIMARY KEY (txid, vout)
);
CREATE INDEX IF NOT EXISTS idx_utxos_script ON utxos(output_script);
CREATE INDEX IF NOT EXISTS idx_utxos_height ON utxos(created_height);

-- Addresses table: rich list + first-seen metadata (balance updated per block).
CREATE TABLE IF NOT EXISTS addresses (
    output_script TEXT PRIMARY KEY,
    first_seen DATE NOT NULL,
    balance_sats BIGINT NOT NULL DEFAULT 0,
    is_coinbase_recipient BOOLEAN NOT NULL DEFAULT FALSE,
    is_miner BOOLEAN NOT NULL DEFAULT FALSE,
    is_staker BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_addresses_first_seen ON addresses(first_seen);
CREATE INDEX IF NOT EXISTS idx_addresses_balance
    ON addresses (balance_sats DESC)
    WHERE balance_sats > 0;
CREATE INDEX IF NOT EXISTS idx_addresses_is_miner ON addresses(is_miner) WHERE is_miner = TRUE;
CREATE INDEX IF NOT EXISTS idx_addresses_is_staker ON addresses(is_staker) WHERE is_staker = TRUE;

-- Token UTXO set at chain tip (one token coloring per output).
-- atoms are NUMERIC: SLP/ALP amounts are uint64-ranged; PG bigint is signed int64.
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
CREATE INDEX IF NOT EXISTS idx_token_utxos_token ON token_utxos(token_id);
CREATE INDEX IF NOT EXISTS idx_token_utxos_script ON token_utxos(output_script);

-- Per-(token, holder) balances for rich lists (atoms; decimals on frontend).
CREATE TABLE IF NOT EXISTS token_balances (
    token_id TEXT NOT NULL,
    output_script TEXT NOT NULL,
    is_mint_baton BOOLEAN NOT NULL DEFAULT FALSE,
    token_protocol TEXT NOT NULL,
    token_type TEXT NOT NULL,
    atoms NUMERIC(78, 0) NOT NULL DEFAULT 0,
    PRIMARY KEY (token_id, output_script, is_mint_baton)
);
CREATE INDEX IF NOT EXISTS idx_token_balances_rich
    ON token_balances (token_id, atoms DESC)
    WHERE atoms > 0;

-- Tokens seen on chain (first genesis or move).
CREATE TABLE IF NOT EXISTS tokens (
    token_id TEXT PRIMARY KEY,
    token_protocol TEXT NOT NULL,
    token_type TEXT NOT NULL,
    first_seen_height INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tokens_protocol ON tokens(token_protocol, token_type);

-- Per-block per-token supply deltas (indexed incrementally per block).
CREATE TABLE IF NOT EXISTS block_token_deltas (
    height INTEGER NOT NULL,
    token_id TEXT NOT NULL,
    genesis_atoms NUMERIC(78, 0) NOT NULL DEFAULT 0,
    mint_atoms NUMERIC(78, 0) NOT NULL DEFAULT 0,
    burn_atoms NUMERIC(78, 0) NOT NULL DEFAULT 0,
    PRIMARY KEY (height, token_id)
);
CREATE INDEX IF NOT EXISTS idx_block_token_deltas_token ON block_token_deltas(token_id);

-- Materialized views for cumulative chart data
-- These provide pre-calculated cumulative values for efficient chart queries

-- Cumulative agora volume data for charts
CREATE MATERIALIZED VIEW IF NOT EXISTS cumulative_agora_volume AS
SELECT 
    date,
    SUM(agora_volume_sats) OVER (ORDER BY date) as cumulative_agora_volume_sats,
    SUM(agora_volume_xecx_sats) OVER (ORDER BY date) as cumulative_agora_volume_xecx_sats,
    SUM(agora_volume_firma_sats) OVER (ORDER BY date) as cumulative_agora_volume_firma_sats,
    -- Cumulative USD volumes calculated from daily USD values (snapshot at time of each day)
    SUM(agora_volume_usd) OVER (ORDER BY date) as cumulative_agora_volume_usd,
    SUM(agora_volume_xecx_usd) OVER (ORDER BY date) as cumulative_agora_volume_xecx_usd,
    SUM(agora_volume_firma_usd) OVER (ORDER BY date) as cumulative_agora_volume_firma_usd
FROM days
ORDER BY date;

-- Cumulative token creation data for charts
CREATE MATERIALIZED VIEW IF NOT EXISTS cumulative_tokens_created AS
SELECT 
    date,
    SUM(tx_count_genesis_alp_token_type_standard) OVER (ORDER BY date) as cumulative_genesis_alp_standard,
    SUM(tx_count_genesis_slp_token_type_fungible) OVER (ORDER BY date) as cumulative_genesis_slp_fungible,
    SUM(tx_count_genesis_slp_token_type_mint_vault) OVER (ORDER BY date) as cumulative_genesis_slp_mint_vault,
    SUM(tx_count_genesis_slp_token_type_nft1_group) OVER (ORDER BY date) as cumulative_genesis_slp_nft1_group,
    SUM(tx_count_genesis_slp_token_type_nft1_child) OVER (ORDER BY date) as cumulative_genesis_slp_nft1_child
FROM days
ORDER BY date;

-- Cumulative claims data for charts
CREATE MATERIALIZED VIEW IF NOT EXISTS cumulative_claims AS
SELECT 
    date,
    SUM(cachet_claim_count) OVER (ORDER BY date) as cumulative_cachet_claims,
    SUM(cashtab_faucet_claim_count) OVER (ORDER BY date) as cumulative_cashtab_faucet_claims
FROM days
ORDER BY date;

-- Cumulative CashFusion data for charts
CREATE MATERIALIZED VIEW IF NOT EXISTS cumulative_fusion AS
SELECT 
    date,
    SUM(fusion_tx_count) OVER (ORDER BY date) as cumulative_fusion_txs
FROM days
ORDER BY date;

-- Cumulative unique addresses ever seen on chain
CREATE MATERIALIZED VIEW IF NOT EXISTS cumulative_addresses AS
SELECT 
    date,
    SUM(new_addresses_count) OVER (ORDER BY date) as cumulative_addresses
FROM days
ORDER BY date;

-- Cumulative miner/staker counts using window functions over daily new counts
CREATE MATERIALIZED VIEW IF NOT EXISTS cumulative_miners_stakers AS
SELECT
    date,
    SUM(new_miners_count) OVER (ORDER BY date) as cumulative_miners,
    SUM(new_stakers_count) OVER (ORDER BY date) as cumulative_stakers
FROM days
ORDER BY date;

-- Indexes for materialized views
CREATE INDEX IF NOT EXISTS idx_cumulative_agora_volume_date ON cumulative_agora_volume(date);
CREATE INDEX IF NOT EXISTS idx_cumulative_tokens_created_date ON cumulative_tokens_created(date);
CREATE INDEX IF NOT EXISTS idx_cumulative_claims_date ON cumulative_claims(date);
CREATE INDEX IF NOT EXISTS idx_cumulative_fusion_date ON cumulative_fusion(date);
CREATE INDEX IF NOT EXISTS idx_cumulative_addresses_date ON cumulative_addresses(date);
CREATE INDEX IF NOT EXISTS idx_cumulative_miners_stakers_date ON cumulative_miners_stakers(date);

-- Function to refresh materialized views
-- Call this after aggregating daily data to keep cumulative views current
CREATE OR REPLACE FUNCTION refresh_cumulative_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW cumulative_agora_volume;
    REFRESH MATERIALIZED VIEW cumulative_tokens_created;
    REFRESH MATERIALIZED VIEW cumulative_claims;
    REFRESH MATERIALIZED VIEW cumulative_fusion;
    REFRESH MATERIALIZED VIEW cumulative_addresses;
    REFRESH MATERIALIZED VIEW cumulative_miners_stakers;
END;
$$ LANGUAGE plpgsql;
