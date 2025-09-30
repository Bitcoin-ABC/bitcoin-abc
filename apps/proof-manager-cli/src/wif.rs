// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use anyhow::{Context, Result};

/// Private key format enumeration
#[derive(Debug, PartialEq)]
pub enum PrivateKeyFormat {
    Hex,
    Wif,
}

/// Detect if a private key string is in WIF format or hex format
pub fn detect_private_key_format(key: &str) -> PrivateKeyFormat {
    let trimmed = key.trim();

    // If it's exactly 64 hex characters, it's hex format
    if trimmed.len() == 64 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        PrivateKeyFormat::Hex
    } else {
        // Otherwise, assume it's WIF format
        // If it's not valid WIF, the decoding will fail with a meaningful error
        PrivateKeyFormat::Wif
    }
}

/// Decode a private key from either hex or WIF format
pub fn decode_private_key(key: &str) -> Result<Vec<u8>> {
    match detect_private_key_format(key) {
        PrivateKeyFormat::Hex => {
            // Decode hex format
            let private_key =
                hex::decode(key).with_context(|| "Invalid private key hex")?;

            // Validate private key length
            if private_key.len() != 32 {
                anyhow::bail!("Private key must be 32 bytes");
            }

            // Validate private key is within valid range (< curve order)
            validate_private_key_range(&private_key)?;

            Ok(private_key)
        }
        PrivateKeyFormat::Wif => {
            // Decode WIF format
            let decoded = bs58::decode(key)
                .into_vec()
                .with_context(|| "Invalid WIF format")?;

            // WIF format:
            // [version_byte][32_byte_private_key][compression_flag]
            // [4_byte_checksum]
            // Length should be 37 bytes (1 + 32 + 1 + 4) for compressed or 38
            // bytes (1 + 32 + 4) for uncompressed
            if decoded.len() != 37 && decoded.len() != 38 {
                anyhow::bail!(
                    "Invalid WIF length: expected 37 or 38 bytes, got {}",
                    decoded.len()
                );
            }

            // Extract private key (skip version byte, take 32 bytes)
            let private_key = &decoded[1..33];

            // Validate private key is within valid range (< curve order)
            validate_private_key_range(private_key)?;

            Ok(private_key.to_vec())
        }
    }
}

/// Encode a private key from raw bytes to WIF format
pub fn encode_private_key_to_wif(
    private_key: &[u8],
    compressed: bool,
) -> Result<String> {
    // Validate private key length
    if private_key.len() != 32 {
        anyhow::bail!("Private key must be 32 bytes");
    }

    // Validate private key is within valid range (< curve order)
    validate_private_key_range(private_key)?;

    // Build WIF payload: [version_byte][32_byte_private_key][compression_flag?]
    let mut payload = Vec::with_capacity(if compressed { 34 } else { 33 });
    payload.push(0x80); // Mainnet version byte
    payload.extend_from_slice(private_key);

    if compressed {
        payload.push(0x01); // Compression flag
    }

    // Calculate double SHA256 checksum
    let hash = avalanche_lib_wasm::hash::sha256d(&payload);
    let checksum = &hash[..4];
    payload.extend_from_slice(checksum);

    // Encode to base58
    Ok(bs58::encode(&payload).into_string())
}

/// Validate that a private key is within the valid range (< curve order)
fn validate_private_key_range(private_key: &[u8]) -> Result<()> {
    // secp256k1 curve order (n) in big-endian format
    let curve_order: [u8; 32] = [
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFE, 0xBA, 0xAE, 0xDC, 0xE6, 0xAF, 0x48, 0xA0, 0x3B,
        0xBF, 0xD2, 0x5E, 0x8C, 0xD0, 0x36, 0x41, 0x41,
    ];

    // Compare byte by byte (big-endian comparison)
    let mut is_greater_or_equal = true;
    for i in 0..32 {
        if private_key[i] < curve_order[i] {
            is_greater_or_equal = false;
            break;
        } else if private_key[i] > curve_order[i] {
            break;
        }
    }

    if is_greater_or_equal {
        anyhow::bail!("Invalid private key: >= curve order");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_hex_format() {
        let hex_key =
            "d31e78a596830a967458f5d8c5117842af0366a1484b5c84bd521b2d61a6915a";
        assert_eq!(detect_private_key_format(hex_key), PrivateKeyFormat::Hex);
    }

    #[test]
    fn test_detect_wif_format() {
        let wif_key = "L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1";
        assert_eq!(detect_private_key_format(wif_key), PrivateKeyFormat::Wif);
    }

    #[test]
    fn test_decode_invalid_hex() {
        let invalid_hex = "invalid_hex";
        let result = decode_private_key(invalid_hex);
        assert!(result.is_err());
    }

    #[test]
    fn test_decode_invalid_wif() {
        let invalid_wif = "invalid_wif";
        let result = decode_private_key(invalid_wif);
        assert!(result.is_err());
    }

    #[test]
    fn test_hex_wif_equivalence() {
        // Test that decoding the same private key in hex and WIF formats
        // returns identical bytes, and that encoding hex to WIF produces the
        // expected WIF

        // Test case 1: WIF 5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ
        // (uncompressed)
        let wif1 = "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ";
        let hex1 =
            "0c28fca386c7a227600b2fe50b7cae11ec86d3bf1fbe471be89827e19d72aa1d";
        let wif_result1 = decode_private_key(wif1).unwrap();
        let hex_result1 = decode_private_key(hex1).unwrap();
        assert_eq!(wif_result1, hex_result1);
        assert_eq!(wif_result1.len(), 32);

        // Test hex to WIF encoding (uncompressed)
        let encoded_wif1 =
            encode_private_key_to_wif(&hex_result1, false).unwrap();
        assert_eq!(encoded_wif1, wif1);

        // Test case 2: WIF Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw
        // (compressed)
        let wif2 = "Kwr371tjA9u2rFSMZjTNun2PXXP3WPZu2afRHTcta6KxEUdm1vEw";
        let hex2 =
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747";
        let wif_result2 = decode_private_key(wif2).unwrap();
        let hex_result2 = decode_private_key(hex2).unwrap();
        assert_eq!(wif_result2, hex_result2);
        assert_eq!(wif_result2.len(), 32);

        // Test hex to WIF encoding (compressed)
        let encoded_wif2 =
            encode_private_key_to_wif(&hex_result2, true).unwrap();
        assert_eq!(encoded_wif2, wif2);

        // Test case 3: WIF L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW
        // (compressed)
        let wif3 = "L4J6gEE4wL9ji2EQbzS5dPMTTsw8LRvcMst1Utij4e3X5ccUSdqW";
        let hex3 =
            "d31e78a596830a967458f5d8c5117842af0366a1484b5c84bd521b2d61a6915a";
        let wif_result3 = decode_private_key(wif3).unwrap();
        let hex_result3 = decode_private_key(hex3).unwrap();
        assert_eq!(wif_result3, hex_result3);
        assert_eq!(wif_result3.len(), 32);

        // Test hex to WIF encoding (compressed)
        let encoded_wif3 =
            encode_private_key_to_wif(&hex_result3, true).unwrap();
        assert_eq!(encoded_wif3, wif3);

        // Test case 4: WIF KzzLLtiYiyFcTXPWUzywt2yEKk5FxkGbMfKhWgBd4oZdt8t8kk77
        // (compressed)
        let wif4 = "KzzLLtiYiyFcTXPWUzywt2yEKk5FxkGbMfKhWgBd4oZdt8t8kk77";
        let hex4 =
            "7077da4a47f6c85a21fe6c6cf1285c0fa06915871744ab1e5a5b741027884d00";
        let wif_result4 = decode_private_key(wif4).unwrap();
        let hex_result4 = decode_private_key(hex4).unwrap();
        assert_eq!(wif_result4, hex_result4);
        assert_eq!(wif_result4.len(), 32);

        // Test hex to WIF encoding (compressed)
        let encoded_wif4 =
            encode_private_key_to_wif(&hex_result4, true).unwrap();
        assert_eq!(encoded_wif4, wif4);
    }
}
