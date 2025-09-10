// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Avalanche stake implementation.

use ecash_secp256k1::schnorr::Signature as SchnorrSig;
use ecash_secp256k1::{Message, Secp256k1};
use wasm_bindgen::prelude::*;

use crate::compactsize::{read_compact_size, write_compact_size};
use crate::hash::Hash256;
use crate::hash::HashWriter;
use crate::key::parse_secret_key;
use crate::outpoint::{OutPoint, TxId};
use crate::pubkey::FormattedPublicKey;
use crate::schnorrsignature::SchnorrSignature;

/// Amount in satoshis.
pub type Amount = u64;

/// Stake ID type.
pub type StakeId = Hash256;

/// Commitment for stakes in an avalanche proof.
#[derive(Debug, Clone, PartialEq, Eq)]
#[wasm_bindgen]
pub struct StakeCommitment {
    expiration_time: i64,
    master_pubkey: FormattedPublicKey,
}

#[wasm_bindgen]
impl StakeCommitment {
    /// Create a new stake commitment.
    #[wasm_bindgen(constructor)]
    pub fn new(
        expiration_time: i64,
        master_pubkey: &[u8],
    ) -> Result<StakeCommitment, String> {
        let master_pubkey = FormattedPublicKey::from_slice(master_pubkey)?;
        Ok(StakeCommitment {
            expiration_time,
            master_pubkey,
        })
    }

    /// Get the commitment hash.
    #[wasm_bindgen(getter)]
    pub fn hash(&self) -> Hash256 {
        let mut writer = HashWriter::new();
        writer.write(&self.serialize());
        let hash = writer.finalize_double();
        Hash256::from_array(hash)
    }

    /// Serialize the stake commitment to bytes.
    #[wasm_bindgen]
    pub fn serialize(&self) -> Vec<u8> {
        let mut data = Vec::new();
        data.extend_from_slice(&self.expiration_time.to_le_bytes());

        // Always use compressed public key format for stake commitment
        // serialization
        let master_pubkey_bytes = self.master_pubkey.serialize_compressed();
        data.extend_from_slice(&write_compact_size(
            master_pubkey_bytes.len() as u64
        ));
        data.extend_from_slice(&master_pubkey_bytes);
        data
    }

    /// Deserialize stake commitment from bytes.
    #[wasm_bindgen]
    pub fn deserialize(data: &[u8]) -> Result<StakeCommitment, String> {
        if data.len() < 8 + 1 + 33 {
            return Err("Insufficient data for stake commitment".to_string());
        }

        let mut offset = 0;

        // Deserialize expiration_time (8 bytes)
        let expiration_time = i64::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
            data[offset + 4],
            data[offset + 5],
            data[offset + 6],
            data[offset + 7],
        ]);
        offset += 8;

        // Deserialize master_pubkey with compact size prefix
        let (pubkey_len, size_len) = read_compact_size(&data[offset..])?;
        offset += size_len;

        if offset + pubkey_len as usize > data.len() {
            return Err("Insufficient data for public key".to_string());
        }

        let master_pubkey_bytes = &data[offset..offset + pubkey_len as usize];
        let master_pubkey =
            FormattedPublicKey::from_slice(master_pubkey_bytes)?;

        Ok(StakeCommitment {
            expiration_time,
            master_pubkey,
        })
    }
}

impl StakeCommitment {
    /// Get as bytes.
    pub fn as_bytes(&self) -> [u8; 32] {
        *self.hash().as_array()
    }
}

/// An avalanche stake representing a UTXO commitment.
#[derive(Debug, Clone, PartialEq, Eq)]
#[wasm_bindgen]
pub struct Stake {
    utxo: OutPoint,
    amount: Amount,
    height_and_coinbase: u32, // Encoded: height << 1 | iscoinbase
    formatted_pubkey: FormattedPublicKey,
}

#[wasm_bindgen]
impl Stake {
    /// Create a new stake.
    #[wasm_bindgen(constructor)]
    pub fn new(
        txid: TxId,
        vout: u32,
        amount: Amount,
        height: u32,
        iscoinbase: bool,
        pubkey: &[u8],
    ) -> Result<Stake, String> {
        let utxo = OutPoint::new(&txid.to_bytes(), vout)?;

        let formatted_pubkey = FormattedPublicKey::from_slice(pubkey)?;

        let encoded_height = (height << 1) | (iscoinbase as u32);
        let stake = Stake {
            utxo,
            amount,
            height_and_coinbase: encoded_height,
            formatted_pubkey,
        };
        Ok(stake)
    }

    /// Get the UTXO outpoint.
    #[wasm_bindgen(getter)]
    pub fn utxo(&self) -> OutPoint {
        self.utxo.clone()
    }

    /// Get the amount in satoshis.
    #[wasm_bindgen(getter)]
    pub fn amount(&self) -> Amount {
        self.amount
    }

    /// Get the block height.
    #[wasm_bindgen(getter)]
    pub fn height(&self) -> u32 {
        self.height_and_coinbase >> 1
    }

    /// Check if this is a coinbase transaction.
    #[wasm_bindgen(js_name = isCoinbase)]
    pub fn iscoinbase(&self) -> bool {
        (self.height_and_coinbase & 1) != 0
    }

    /// Get the public key as bytes in original format (compressed or
    /// uncompressed).
    #[wasm_bindgen(js_name = pubkey)]
    pub fn pubkey(&self) -> Vec<u8> {
        self.formatted_pubkey.serialize()
    }

    /// Get the stake ID.
    #[wasm_bindgen(js_name = stakeId)]
    pub fn stake_id(&self) -> StakeId {
        Self::compute_stake_id(
            &self.utxo,
            self.amount,
            self.height_and_coinbase,
            &self.pubkey(),
        )
    }

    pub fn get_hash(&self, commitment: &StakeCommitment) -> Hash256 {
        let mut writer = HashWriter::new();
        writer.write(&commitment.as_bytes());

        writer.write(self.utxo.txid().as_ref());
        writer.write_u32_le(self.utxo.vout());
        writer.write_u64_le(self.amount);
        writer.write_u32_le(self.height_and_coinbase);

        let pubkey_bytes = self.pubkey();
        writer.write(&write_compact_size(pubkey_bytes.len() as u64));
        writer.write(&pubkey_bytes);

        let hash = writer.finalize_double();
        Hash256::from_array(hash)
    }

    pub fn serialize(&self) -> Vec<u8> {
        let mut data = Vec::new();

        data.extend_from_slice(self.utxo.txid().as_ref());
        data.extend_from_slice(&self.utxo.vout().to_le_bytes());

        data.extend_from_slice(&self.amount.to_le_bytes());

        data.extend_from_slice(&self.height_and_coinbase.to_le_bytes());

        // Use format-preserving serialization
        let pubkey_bytes = self.pubkey();
        data.extend_from_slice(&write_compact_size(pubkey_bytes.len() as u64));
        data.extend_from_slice(&pubkey_bytes);

        data
    }

    /// Deserialize stake from bytes.
    #[wasm_bindgen]
    pub fn deserialize(data: &[u8]) -> Result<Stake, String> {
        if data.len() < 32 + 4 + 8 + 4 + 1 + 33 {
            return Err("Insufficient data for stake".to_string());
        }

        let mut offset = 0;

        // Deserialize UTXO txid (32 bytes)
        let txid = TxId::new(&data[offset..offset + 32])?;
        offset += 32;

        // Deserialize UTXO vout (4 bytes)
        let vout = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]);
        offset += 4;

        // Deserialize amount (8 bytes)
        let amount = u64::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
            data[offset + 4],
            data[offset + 5],
            data[offset + 6],
            data[offset + 7],
        ]);
        offset += 8;

        // Deserialize encoded height (4 bytes)
        let encoded_height = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]);
        offset += 4;

        // Decode height and coinbase flag
        let height = encoded_height >> 1;
        let iscoinbase = (encoded_height & 1) != 0;

        // Deserialize pubkey (compact size + pubkey bytes)
        let (pubkey_len, pubkey_len_size) = read_compact_size(&data[offset..])?;
        offset += pubkey_len_size;

        if pubkey_len != 33 && pubkey_len != 65 {
            return Err(format!(
                "Invalid public key length: expected 33 or 65 bytes, got {}",
                pubkey_len
            ));
        }

        if data.len() < offset + pubkey_len as usize {
            return Err(format!(
                "Invalid stake format: insufficient data for {} byte public \
                 key",
                pubkey_len
            ));
        }

        let formatted_pubkey = FormattedPublicKey::from_slice(
            &data[offset..offset + pubkey_len as usize],
        )?;

        let utxo = OutPoint::new(&txid.to_bytes(), vout)?;
        let encoded_height = (height << 1) | (iscoinbase as u32);
        let stake = Stake {
            utxo,
            amount,
            height_and_coinbase: encoded_height,
            formatted_pubkey,
        };

        Ok(stake)
    }

    /// Create stake from hex string.
    #[wasm_bindgen(js_name = fromHex)]
    pub fn from_hex(hex: &str) -> Result<Stake, String> {
        let hex = hex.trim_start_matches("0x");
        let bytes =
            hex::decode(hex).map_err(|e| format!("Invalid hex: {}", e))?;
        Self::deserialize(&bytes)
    }

    /// Convert to hex string.
    #[wasm_bindgen(js_name = toHex)]
    pub fn to_hex(&self) -> String {
        hex::encode(self.serialize())
    }
}

impl Stake {
    /// Compute the stake ID based on the stake data.
    fn compute_stake_id(
        utxo: &OutPoint,
        amount: Amount,
        height: u32,
        pubkey_bytes: &[u8],
    ) -> StakeId {
        let mut writer = HashWriter::new();
        writer.write(&utxo.txid().as_ref());
        writer.write_u32_le(utxo.vout());
        writer.write_u64_le(amount);
        writer.write_u32_le(height);

        writer.write(&write_compact_size(pubkey_bytes.len() as u64));
        writer.write(pubkey_bytes);

        let hash = writer.finalize_double();
        StakeId::from_array(hash)
    }
}

impl PartialOrd for Stake {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Stake {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.stake_id().as_ref().cmp(other.stake_id().as_ref())
    }
}

/// A signed stake in an avalanche proof.
#[derive(Debug, Clone, PartialEq, Eq)]
#[wasm_bindgen]
pub struct SignedStake {
    stake: Stake,
    signature: SchnorrSignature,
}

#[wasm_bindgen]
impl SignedStake {
    /// Create a signed stake from components.
    #[wasm_bindgen(constructor)]
    pub fn new(stake: Stake, signature: SchnorrSignature) -> SignedStake {
        SignedStake { stake, signature }
    }

    /// Create a signed stake by signing with a private key.
    #[wasm_bindgen(js_name = createSigned)]
    pub fn create_signed(
        stake: Stake,
        private_key: &[u8],
        commitment: StakeCommitment,
    ) -> Result<SignedStake, String> {
        let private_key = parse_secret_key(private_key)?;
        let hash = stake.get_hash(&commitment);

        let hash_array: [u8; 32] = match hash.as_ref().try_into() {
            Ok(arr) => arr,
            Err(_) => return Err("Invalid hash length".to_string()),
        };

        let message = Message::from_digest(hash_array);

        let secp = Secp256k1::new();
        let signature =
            secp.sign_schnorrabc_no_aux_rand(&message, &private_key);

        let sig_bytes: [u8; 64] = *signature.as_ref();

        Ok(SignedStake {
            stake,
            signature: SchnorrSignature::from_array(sig_bytes),
        })
    }

    /// Get the underlying stake.
    #[wasm_bindgen(getter)]
    pub fn stake(&self) -> Stake {
        self.stake.clone()
    }

    /// Get the signature as bytes.
    #[wasm_bindgen(js_name = signature)]
    pub fn signature(&self) -> Vec<u8> {
        self.signature.as_ref().to_vec()
    }

    /// Serialize the signed stake to bytes.
    #[wasm_bindgen]
    pub fn serialize(&self) -> Vec<u8> {
        let mut data = Vec::new();

        data.extend_from_slice(&self.stake.utxo.txid().as_ref());
        data.extend_from_slice(&self.stake.utxo.vout().to_le_bytes());
        data.extend_from_slice(&self.stake.amount.to_le_bytes());
        data.extend_from_slice(&self.stake.height_and_coinbase.to_le_bytes());

        // Serialize pubkey with compact size prefix (format-preserving)
        let pubkey_bytes = self.stake.pubkey();
        data.extend_from_slice(&write_compact_size(pubkey_bytes.len() as u64));
        data.extend_from_slice(&pubkey_bytes);

        data.extend_from_slice(self.signature.as_ref());

        data
    }

    /// Convert to hex string.
    #[wasm_bindgen(js_name = toHex)]
    pub fn to_hex(&self) -> String {
        hex::encode(self.serialize())
    }

    /// Create signed stake from hex string.
    #[wasm_bindgen(js_name = fromHex)]
    pub fn from_hex(hex: &str) -> Result<SignedStake, String> {
        let hex = hex.trim_start_matches("0x");
        let bytes =
            hex::decode(hex).map_err(|e| format!("Invalid hex: {}", e))?;
        Self::deserialize(&bytes)
    }

    /// Deserialize signed stake from bytes.
    #[wasm_bindgen]
    pub fn deserialize(data: &[u8]) -> Result<SignedStake, String> {
        if data.len() < 32 + 4 + 8 + 4 + 1 + 33 + 64 {
            return Err("Insufficient data for signed stake".to_string());
        }

        let mut offset = 0;

        // Deserialize UTXO txid (32 bytes)
        let txid = TxId::new(&data[offset..offset + 32])?;
        offset += 32;

        // Deserialize UTXO vout (4 bytes)
        let vout = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]);
        offset += 4;

        // Deserialize amount (8 bytes)
        let amount = u64::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
            data[offset + 4],
            data[offset + 5],
            data[offset + 6],
            data[offset + 7],
        ]);
        offset += 8;

        // Deserialize encoded height (4 bytes)
        let encoded_height = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]);
        offset += 4;

        // Decode height and coinbase flag
        let height = encoded_height >> 1;
        let iscoinbase = (encoded_height & 1) != 0;

        // Deserialize pubkey (compact size + pubkey bytes)
        let (pubkey_len, pubkey_len_size) = read_compact_size(&data[offset..])?;
        offset += pubkey_len_size;

        if data.len() < offset + pubkey_len as usize {
            return Err(format!(
                "Invalid signed stake format: insufficient data for {} byte \
                 public key",
                pubkey_len
            ));
        }

        let formatted_pubkey = FormattedPublicKey::from_slice(
            &data[offset..offset + pubkey_len as usize],
        )?;
        offset += pubkey_len as usize;

        if data.len() < offset + 64 as usize {
            return Err("Invalid signed stake format: insufficient data for \
                        64 byte Schnorr signature"
                .to_string());
        }
        // Deserialize signature (64 bytes)
        let signature = SchnorrSignature::new(&data[offset..offset + 64])?;

        let utxo = OutPoint::new(&txid.to_bytes(), vout)?;
        let encoded_height = (height << 1) | (iscoinbase as u32);
        let stake = Stake {
            utxo,
            amount,
            height_and_coinbase: encoded_height,
            formatted_pubkey,
        };

        Ok(SignedStake::new(stake, signature))
    }

    /// Verify the signature against the commitment.
    #[wasm_bindgen(js_name = verify)]
    pub fn verify(&self, commitment: &StakeCommitment) -> bool {
        let hash = self.stake.get_hash(commitment);

        let hash_array: [u8; 32] = match hash.as_ref().try_into() {
            Ok(arr) => arr,
            Err(_) => return false,
        };

        let message = Message::from_digest(hash_array);

        let signature = SchnorrSig::from_byte_array(*self.signature.as_array());

        let secp = Secp256k1::new();
        secp.verify_schnorrabc(
            &signature,
            &message,
            self.stake.formatted_pubkey.public_key(),
        )
        .is_ok()
    }
}

impl PartialOrd for SignedStake {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for SignedStake {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.stake
            .stake_id()
            .as_ref()
            .cmp(other.stake.stake_id().as_ref())
    }
}

impl SignedStake {
    /// Deserialize signed stake from bytes, returning both the stake and the
    /// number of bytes consumed.
    pub fn deserialize_with_size(
        data: &[u8],
    ) -> Result<(SignedStake, usize), String> {
        if data.len() < 32 + 4 + 8 + 4 + 1 + 33 + 64 {
            // txid + vout + amount + height + pubkey_size + min_pubkey +
            // signature
            return Err("Insufficient data for signed stake".to_string());
        }

        let mut offset = 0;

        // Deserialize UTXO txid (32 bytes)
        let txid = TxId::new(&data[offset..offset + 32])?;
        offset += 32;

        // Deserialize UTXO vout (4 bytes)
        let vout = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]);
        offset += 4;

        // Deserialize amount (8 bytes)
        let amount = u64::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
            data[offset + 4],
            data[offset + 5],
            data[offset + 6],
            data[offset + 7],
        ]);
        offset += 8;

        // Deserialize encoded height (4 bytes)
        let encoded_height = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]);
        offset += 4;

        // Decode height and coinbase flag
        let height = encoded_height >> 1;
        let iscoinbase = (encoded_height & 1) != 0;

        // Deserialize pubkey (compact size + pubkey bytes to match Python
        // implementation)
        let (pubkey_size, pubkey_size_bytes) =
            read_compact_size(&data[offset..])?;
        offset += pubkey_size_bytes;

        if pubkey_size != 33 && pubkey_size != 65 {
            return Err(format!(
                "Invalid public key length: expected 33 or 65 bytes, got {}",
                pubkey_size
            ));
        }

        if data.len() < offset + pubkey_size as usize {
            return Err("Invalid signed stake format: missing public key data"
                .to_string());
        }

        let formatted_pubkey = FormattedPublicKey::from_slice(
            &data[offset..offset + pubkey_size as usize],
        )?;
        offset += pubkey_size as usize;

        if data.len() < offset + 64 as usize {
            return Err("Invalid signed stake format: insufficient data for \
                        64 byte Schnorr signature"
                .to_string());
        }

        // Deserialize signature (64 bytes)
        let signature = SchnorrSignature::new(&data[offset..offset + 64])?;
        offset += 64;

        // Create Stake directly to preserve format
        let utxo = OutPoint::new(&txid.to_bytes(), vout)?;
        let encoded_height = (height << 1) | (iscoinbase as u32);
        let stake = Stake {
            utxo,
            amount,
            height_and_coinbase: encoded_height,
            formatted_pubkey,
        };

        Ok((SignedStake::new(stake, signature), offset))
    }
}
