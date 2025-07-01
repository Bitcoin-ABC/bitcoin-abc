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
    app_txs_count INTEGER NOT NULL
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
    price_usd DECIMAL(12, 8)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);
CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);
CREATE INDEX IF NOT EXISTS idx_days_price ON days(price_usd) WHERE price_usd IS NOT NULL;

-- Materialized views for cumulative chart data
-- These provide pre-calculated cumulative values for efficient chart queries

-- Cumulative agora volume data for charts
CREATE MATERIALIZED VIEW IF NOT EXISTS cumulative_agora_volume AS
SELECT 
    date,
    SUM(agora_volume_sats) OVER (ORDER BY date) as cumulative_agora_volume_sats,
    SUM(agora_volume_xecx_sats) OVER (ORDER BY date) as cumulative_agora_volume_xecx_sats,
    SUM(agora_volume_firma_sats) OVER (ORDER BY date) as cumulative_agora_volume_firma_sats
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

-- Indexes for materialized views
CREATE INDEX IF NOT EXISTS idx_cumulative_agora_volume_date ON cumulative_agora_volume(date);
CREATE INDEX IF NOT EXISTS idx_cumulative_tokens_created_date ON cumulative_tokens_created(date);
CREATE INDEX IF NOT EXISTS idx_cumulative_claims_date ON cumulative_claims(date);

-- Function to refresh materialized views
-- Call this after aggregating daily data to keep cumulative views current
CREATE OR REPLACE FUNCTION refresh_cumulative_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW cumulative_agora_volume;
    REFRESH MATERIALIZED VIEW cumulative_tokens_created;
    REFRESH MATERIALIZED VIEW cumulative_claims;
END;
$$ LANGUAGE plpgsql;
