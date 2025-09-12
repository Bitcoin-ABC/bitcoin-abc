// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use serde::{Deserialize, Deserializer, Serializer};

/// Custom serializer to convert satoshis to XEC with 2 decimal places
pub fn serialize_amount_as_xec<S>(
    amount: &u64,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    // Use integer arithmetic to preserve precision
    let xec_whole = amount / 100;
    let xec_cents = amount % 100;
    let formatted = format!("{}.{:02}", xec_whole, xec_cents);

    let xec_amount: f64 = formatted.parse().unwrap();
    serializer.serialize_f64(xec_amount)
}

/// Custom deserializer to convert XEC with 2 decimal places back to satoshis
pub fn deserialize_amount_from_xec<'de, D>(
    deserializer: D,
) -> Result<u64, D::Error>
where
    D: Deserializer<'de>,
{
    let xec_amount: f64 = f64::deserialize(deserializer)?;
    Ok((xec_amount * 100.0).round() as u64)
}

/// Custom serializer to convert signature bytes to base64 string
pub fn serialize_signature_as_base64<S>(
    signature: &Vec<u8>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    // Signature is stored as bytes, convert directly to base64
    use base64::{engine::general_purpose, Engine as _};
    let base64_string = general_purpose::STANDARD.encode(signature);
    serializer.serialize_str(&base64_string)
}

/// Custom deserializer to convert base64 string back to signature bytes for
/// internal use
pub fn deserialize_signature_from_base64<'de, D>(
    deserializer: D,
) -> Result<Vec<u8>, D::Error>
where
    D: Deserializer<'de>,
{
    let base64_string: String = String::deserialize(deserializer)?;
    use base64::{engine::general_purpose, Engine as _};
    general_purpose::STANDARD
        .decode(&base64_string)
        .map_err(serde::de::Error::custom)
}

/// Custom serializer to convert uint256 bytes to little endian hex string for
/// JSON (Bitcoin standard display)
pub fn serialize_uint256_to_le_hex<S>(
    id: &Vec<u8>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    // Reverse the bytes and encode as hex
    let mut reversed = id.clone();
    reversed.reverse();
    let reversed_hex = hex::encode(reversed);
    serializer.serialize_str(&reversed_hex)
}

/// Custom deserializer to convert little endian hex string from JSON to uint256
/// bytes (Bitcoin standard input)
pub fn deserialize_uint256_from_le_hex<'de, D>(
    deserializer: D,
) -> Result<Vec<u8>, D::Error>
where
    D: Deserializer<'de>,
{
    let hex_string: String = String::deserialize(deserializer)?;
    match hex::decode(&hex_string) {
        Ok(mut bytes) => {
            bytes.reverse();
            Ok(bytes)
        }
        Err(_) => {
            // If it's not valid hex, return empty vector
            Ok(Vec::new())
        }
    }
}

/// Custom serializer to convert pubkey bytes to hex string (preserves format:
/// compressed vs uncompressed)
pub fn serialize_pubkey_as_hex<S>(
    pubkey: &Vec<u8>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    let hex_string = hex::encode(pubkey);
    serializer.serialize_str(&hex_string)
}

/// Custom deserializer to convert hex string back to pubkey bytes (preserves
/// format: compressed vs uncompressed)
pub fn deserialize_pubkey_from_hex<'de, D>(
    deserializer: D,
) -> Result<Vec<u8>, D::Error>
where
    D: Deserializer<'de>,
{
    let hex_string: String = String::deserialize(deserializer)?;
    match hex::decode(&hex_string) {
        Ok(bytes) => {
            // Validate that it's either 33 bytes (compressed) or 65 bytes
            // (uncompressed)
            if bytes.len() == 33 || bytes.len() == 65 {
                Ok(bytes)
            } else {
                Err(serde::de::Error::custom(format!(
                    "Invalid pubkey length: expected 33 or 65 bytes, got {}",
                    bytes.len()
                )))
            }
        }
        Err(_) => {
            Err(serde::de::Error::custom("Invalid hex string for pubkey"))
        }
    }
}
