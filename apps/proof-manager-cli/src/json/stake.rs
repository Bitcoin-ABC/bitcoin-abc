// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use anyhow::{Context, Result};
use avalanche_lib_wasm::stake::SignedStake;
use serde::{Deserialize, Serialize};

use super::serdes::{
    deserialize_amount_from_xec, deserialize_pubkey_from_hex,
    deserialize_signature_from_base64, deserialize_uint256_from_le_hex,
    serialize_amount_as_xec, serialize_pubkey_as_hex,
    serialize_signature_as_base64, serialize_uint256_to_le_hex,
};

// Wrapper type for self-describing JSON format
#[derive(Debug, Serialize, Deserialize)]
pub struct WrappedStakes {
    pub stakes: Vec<StakeJson>,
}

// Stake for both signing workflow and proof creation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StakeJson {
    #[serde(
        serialize_with = "serialize_uint256_to_le_hex",
        deserialize_with = "deserialize_uint256_from_le_hex"
    )]
    pub txid: Vec<u8>,
    pub vout: u32,
    #[serde(
        serialize_with = "serialize_amount_as_xec",
        deserialize_with = "deserialize_amount_from_xec"
    )]
    pub amount: u64,
    pub height: u32,
    pub iscoinbase: bool,
    #[serde(
        serialize_with = "serialize_pubkey_as_hex",
        deserialize_with = "deserialize_pubkey_from_hex"
    )]
    pub pubkey: Vec<u8>,
    #[serde(
        default, // Make signature optional for deserialization
        skip_serializing_if = "Vec::is_empty",
        serialize_with = "serialize_signature_as_base64",
        deserialize_with = "deserialize_signature_from_base64"
    )]
    pub signature: Vec<u8>, // Optional signature
}

/// Convert JSON signed stakes to WASM SignedStake objects
pub fn json_to_signed_stakes(
    json_content: &str,
) -> Result<Vec<avalanche_lib_wasm::stake::SignedStake>> {
    let wrapped: WrappedStakes = serde_json::from_str(json_content)
        .with_context(|| "Failed to parse signed stakes JSON")?;

    let mut signed_stakes = Vec::new();
    for stake_config in wrapped.stakes {
        let signed_stake = json_to_signed_stake(&stake_config)?;
        signed_stakes.push(signed_stake);
    }

    Ok(signed_stakes)
}

/// Convert individual stake config to WASM SignedStake
pub fn json_to_signed_stake(
    stake_config: &StakeJson,
) -> Result<avalanche_lib_wasm::stake::SignedStake> {
    let txid_bytes = stake_config.txid.clone();
    let pubkey_bytes = &stake_config.pubkey;
    let signature_bytes = &stake_config.signature;

    // Reject unsigned stakes - decode command only works with signed objects
    if signature_bytes.is_empty() {
        anyhow::bail!(
            "Cannot decode unsigned stake. The command only works with signed \
             objects."
        );
    }

    let signature =
        avalanche_lib_wasm::schnorrsignature::SchnorrSignature::new(
            signature_bytes,
        )
        .map_err(|e| anyhow::anyhow!("Invalid signature: {}", e))?;

    Ok(avalanche_lib_wasm::stake::SignedStake::new(
        avalanche_lib_wasm::stake::Stake::new(
            avalanche_lib_wasm::hash::Hash256::new(&txid_bytes)
                .map_err(|e| anyhow::anyhow!("Invalid txid: {}", e))?,
            stake_config.vout,
            stake_config.amount,
            stake_config.height,
            stake_config.iscoinbase,
            pubkey_bytes,
        )
        .map_err(|e| anyhow::anyhow!("Invalid stake: {}", e))?,
        signature,
    ))
}

/// Convert WASM SignedStake objects to JSON
pub fn signed_stakes_to_json(stakes: &[SignedStake]) -> Result<String> {
    let mut stake_configs = Vec::new();

    for signed_stake in stakes {
        let stake_data = signed_stake.stake();
        let stake_config = StakeJson {
            txid: stake_data.utxo().txid().to_bytes(),
            vout: stake_data.utxo().vout(),
            amount: stake_data.amount(),
            height: stake_data.height(),
            iscoinbase: stake_data.iscoinbase(),
            pubkey: stake_data.pubkey(),
            signature: signed_stake.signature().to_vec(),
        };
        stake_configs.push(stake_config);
    }

    let wrapped = WrappedStakes {
        stakes: stake_configs,
    };
    serde_json::to_string_pretty(&wrapped)
        .with_context(|| "Failed to serialize stakes to JSON")
}
