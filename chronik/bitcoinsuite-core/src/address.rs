// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Implements the CashAddress format for eCash addresses with
//! encoding, decoding, and validation.

use std::str::FromStr;

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    hash::{Hashed, ShaRmd160},
    script::Script,
};

/// Character set used for base-32 encoding in CashAddress format
const CHARSET: &[u8] = b"qpzry9x8gf2tvdw0s3jn54khce6mua7l";

/// Types of addresses in the CashAddress format
#[derive(Deserialize, Serialize, Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum AddressType {
    /// Pay to Public Key Hash - used for standard addresses
    P2PKH = 0,
    /// Pay to Script Hash - used for multi-signature and contract addresses
    P2SH = 8,
}

/// Represents an eCash address in the CashAddress format
///
/// The CashAddress format was introduced in eCash to provide a distinct
/// address format from Bitcoin and improve user experience by including error
/// detection.
#[derive(Clone, Debug, Eq, PartialEq, Hash)]
pub struct CashAddress {
    /// Type of address (P2PKH or P2SH)
    addr_type: AddressType,
    /// The hash160 of the public key or script
    hash: ShaRmd160,
    /// Complete cash address string including prefix
    cash_addr: String,
    /// Network prefix (e.g., "ecash", "etoken")
    prefix: String,
}

/// Errors that can occur when working with CashAddresses
#[derive(Error, Clone, Copy, Debug, Eq, PartialEq)]
pub enum CashAddressError {
    /// Address checksum verification failed
    #[error("Invalid checksum")]
    InvalidChecksum,

    /// Invalid character in the base32 encoding
    #[error("Invalid Base32 letter {1} at index {0}")]
    InvalidBase32Letter(usize, u8),

    /// The version byte specifies an unknown address type
    #[error("Invalid address type {0}")]
    InvalidAddressType(u8),

    /// Address string doesn't contain a prefix
    #[error("Missing prefix")]
    MissingPrefix,

    /// The payload has an incorrect length
    #[error("Invalid payload length: {0}")]
    InvalidPayloadLength(usize),
}

impl CashAddress {
    /// Creates a new CashAddress from a hash160 value
    ///
    /// # Arguments
    ///
    /// * `prefix` - The network prefix (e.g., "ecash", "etoken")
    /// * `addr_type` - The type of address (P2PKH or P2SH)
    /// * `hash` - The hash160 of the public key or script
    ///
    /// # Returns
    ///
    /// A new CashAddress instance
    pub fn from_hash(
        prefix: impl Into<String>,
        addr_type: AddressType,
        hash: ShaRmd160,
    ) -> Self {
        let prefix: String = prefix.into();
        CashAddress {
            cash_addr: to_cash_addr(&prefix, addr_type, hash.as_le_bytes()),
            addr_type,
            hash,
            prefix,
        }
    }

    /// Creates a P2SH CashAddress from a redeem script
    ///
    /// # Arguments
    ///
    /// * `prefix` - The network prefix (e.g., "ecash", "etoken")
    /// * `redeem_script` - The redeem script for the P2SH address
    ///
    /// # Returns
    ///
    /// A new P2SH CashAddress
    pub fn from_redeem_script(
        prefix: impl Into<String>,
        redeem_script: Script,
    ) -> Self {
        CashAddress::from_hash(
            prefix,
            AddressType::P2SH,
            ShaRmd160::digest(redeem_script.bytecode().clone()),
        )
    }

    /// Returns the hash160 of this address
    pub fn hash(&self) -> &ShaRmd160 {
        &self.hash
    }

    /// Returns the network prefix of this address
    pub fn prefix(&self) -> &str {
        &self.prefix
    }

    /// Returns the complete cash address as a string
    pub fn as_str(&self) -> &str {
        &self.cash_addr
    }

    /// Consumes the address and returns the string representation
    pub fn into_string(self) -> String {
        self.cash_addr
    }

    /// Returns the type of this address (P2PKH or P2SH)
    pub fn addr_type(&self) -> AddressType {
        self.addr_type
    }

    /// Creates a new CashAddress with the same hash and type but a different
    /// prefix
    ///
    /// # Arguments
    ///
    /// * `prefix` - The new network prefix
    ///
    /// # Returns
    ///
    /// A new CashAddress with the updated prefix
    pub fn with_prefix(&self, prefix: impl Into<String>) -> Self {
        Self::from_hash(prefix, self.addr_type, self.hash)
    }

    /// Converts the address to an eCash script
    ///
    /// # Returns
    ///
    /// The corresponding Script for this address
    pub fn to_script(&self) -> Script {
        match self.addr_type {
            AddressType::P2PKH => Script::p2pkh(self.hash()),
            AddressType::P2SH => Script::p2sh(self.hash()),
        }
    }
}

impl FromStr for CashAddress {
    type Err = CashAddressError;

    /// Parses a string into a CashAddress
    ///
    /// # Arguments
    ///
    /// * `s` - The string to parse
    ///
    /// # Returns
    ///
    /// A CashAddress if parsing was successful, otherwise an error
    fn from_str(s: &str) -> Result<Self, CashAddressError> {
        let (hash, addr_type, prefix) = from_cash_addr(s)?;

        Ok(CashAddress {
            cash_addr: s.to_string(),
            addr_type,
            hash,
            prefix,
        })
    }
}

/// Maps data bytes to base32 characters
///
/// # Arguments
///
/// * `data` - Iterator of bytes to convert to base32
///
/// # Returns
///
/// A string of base32-encoded characters
fn map_to_b32(data: impl Iterator<Item = u8>) -> String {
    String::from_utf8(data.map(|x| CHARSET[x as usize]).collect()).unwrap()
}

/// Maps base32 characters back to bytes
///
/// # Arguments
///
/// * `string` - The base32 string to decode
///
/// # Returns
///
/// A vector of decoded bytes or an error if the input contains invalid
/// characters
fn map_from_b32(
    string: &str,
) -> std::result::Result<Vec<u8>, CashAddressError> {
    string
        .as_bytes()
        .iter()
        .enumerate()
        .map(|(i, x)| {
            CHARSET
                .iter()
                .position(|c| x == c)
                .map(|x| x as u8)
                .ok_or(CashAddressError::InvalidBase32Letter(i, *x))
        })
        .collect()
}

/// Converts between bit widths
///
/// Used to convert between 8-bit bytes and 5-bit base32 characters
///
/// # Arguments
///
/// * `data` - Iterator of input data
/// * `from_bits` - Number of bits per input element
/// * `to_bits` - Number of bits per output element
/// * `pad` - Whether to pad the output if necessary
///
/// # Returns
///
/// A vector of converted values or None if conversion failed
fn convert_bits(
    data: impl Iterator<Item = u8>,
    from_bits: u32,
    to_bits: u32,
    pad: bool,
) -> Option<Vec<u8>> {
    let mut acc = 0;
    let mut bits = 0;
    let mut ret = Vec::new();
    let maxv = (1 << to_bits) - 1;
    let max_acc = (1 << (from_bits + to_bits - 1)) - 1;
    for value in data {
        let value = value as u32;
        if (value >> from_bits) != 0 {
            return None;
        }
        acc = ((acc << from_bits) | value) & max_acc;
        bits += from_bits;
        while bits >= to_bits {
            bits -= to_bits;
            ret.push(((acc >> bits) & maxv) as u8);
        }
    }
    if pad {
        if bits != 0 {
            ret.push(((acc << (to_bits - bits)) & maxv) as u8);
        }
    } else if bits >= from_bits || ((acc << (to_bits - bits)) & maxv != 0) {
        return None;
    }
    Some(ret)
}

/// Calculates the BCH code polynomial for error detection
///
/// # Arguments
///
/// * `values` - Iterator of values to include in the calculation
///
/// # Returns
///
/// The calculated checksum polynomial
fn poly_mod(values: impl Iterator<Item = u8>) -> u64 {
    let mut c = 1;
    for value in values {
        let c0 = (c >> 35) as u8;
        c = ((c & 0x07_ffff_ffffu64) << 5u64) ^ (value as u64);
        if c0 & 0x01 != 0 {
            c ^= 0x98_f2bc_8e61
        }
        if c0 & 0x02 != 0 {
            c ^= 0x79_b76d_99e2
        }
        if c0 & 0x04 != 0 {
            c ^= 0xf3_3e5f_b3c4
        }
        if c0 & 0x08 != 0 {
            c ^= 0xae_2eab_e2a8
        }
        if c0 & 0x10 != 0 {
            c ^= 0x1e_4f43_e470
        }
    }
    c ^ 1
}

/// Calculates the checksum for a CashAddress
///
/// # Arguments
///
/// * `prefix` - The address prefix
/// * `payload` - Iterator of payload bytes
///
/// # Returns
///
/// The calculated checksum as a vector of bytes
fn calculate_checksum(
    prefix: &str,
    payload: impl Iterator<Item = u8>,
) -> Vec<u8> {
    let poly = poly_mod(
        prefix
            .as_bytes()
            .iter()
            .map(|x| *x & 0x1f)
            .chain([0])
            .chain(payload)
            .chain([0, 0, 0, 0, 0, 0, 0, 0]),
    );
    (0..8)
        .map(|i| ((poly >> (5 * (7 - i))) & 0x1f) as u8)
        .collect()
}

/// Verifies the checksum of a CashAddress
///
/// # Arguments
///
/// * `prefix` - The address prefix
/// * `payload` - Iterator of payload bytes including the checksum
///
/// # Returns
///
/// true if the checksum is valid, false otherwise
fn verify_checksum(prefix: &str, payload: impl Iterator<Item = u8>) -> bool {
    let poly = poly_mod(
        prefix
            .as_bytes()
            .iter()
            .map(|x| *x & 0x1f)
            .chain([0])
            .chain(payload),
    );
    poly == 0
}

/// Converts a hash and type to a CashAddress string
///
/// # Arguments
///
/// * `prefix` - The address prefix
/// * `addr_type` - The address type value
/// * `addr_bytes` - The hash160 bytes
///
/// # Returns
///
/// The complete CashAddress as a string
fn to_cash_addr(
    prefix: &str,
    addr_type: AddressType,
    addr_bytes: &[u8],
) -> String {
    let type_byte = addr_type as u8;

    let mut combined = vec![type_byte];
    combined.extend_from_slice(addr_bytes);

    let payload = convert_bits(combined.into_iter(), 8, 5, true).unwrap();

    let checksum = calculate_checksum(prefix, payload.iter().cloned());

    format!(
        "{}:{}",
        prefix,
        map_to_b32(payload.into_iter().chain(checksum))
    )
}

/// Parses a CashAddress string into its components
///
/// # Arguments
///
/// * `addr_string` - The CashAddress string to parse
///
/// # Returns
///
/// A tuple containing (hash160, address type, prefix) or an error
pub fn from_cash_addr(
    addr_string: &str,
) -> Result<(ShaRmd160, AddressType, String), CashAddressError> {
    let addr_string = addr_string.to_ascii_lowercase();
    let (prefix, payload_base32) = match addr_string.find(':') {
        Some(pos) => {
            let (prefix, payload_base32) = addr_string.split_at(pos + 1);
            (prefix[..prefix.len() - 1].to_string(), payload_base32)
        }
        None => return Err(CashAddressError::MissingPrefix),
    };
    let decoded = map_from_b32(payload_base32)?;
    let converted =
        convert_bits(decoded.clone().into_iter(), 5, 8, true).unwrap();
    let hash = &converted[1..converted.len() - 6];
    let hash: [u8; 20] = match hash.try_into() {
        Ok(hash) => hash,
        Err(_) => {
            return Err(CashAddressError::InvalidPayloadLength(hash.len()))
        }
    };
    if !verify_checksum(&prefix, decoded.iter().cloned()) {
        return Err(CashAddressError::InvalidChecksum);
    }
    Ok((
        ShaRmd160(hash),
        match converted[0] {
            0 => AddressType::P2PKH,
            8 => AddressType::P2SH,
            x => return Err(CashAddressError::InvalidAddressType(x)),
        },
        prefix,
    ))
}

#[cfg(test)]
mod tests {
    use bytes::Bytes;
    use hex::decode;

    use crate::address::{
        AddressType, CashAddress, CashAddressError, Hashed, Script, ShaRmd160,
    };

    #[test]
    fn test_from_hash1() {
        let addr = CashAddress::from_hash(
            "ecash",
            AddressType::P2PKH,
            ShaRmd160::from_be_hex(&"0".repeat(40)).unwrap(),
        );
        assert_eq!(
            addr.as_str(),
            "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx"
        );
    }

    #[test]
    fn test_from_hash2() {
        let addr = CashAddress::from_hash(
            "ecash",
            AddressType::P2SH,
            ShaRmd160::from_be_hex(&"0".repeat(40)).unwrap(),
        );
        assert_eq!(
            addr.as_str(),
            "ecash:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8m7jvrjm"
        );
    }

    #[test]
    fn test_from_hash3() -> Result<(), abc_rust_error::Report> {
        let addr = CashAddress::from_hash(
            "redridinghood",
            AddressType::P2SH,
            ShaRmd160::from_be_hex(&"0".repeat(40))?,
        );
        assert_eq!(
            addr.as_str(),
            "redridinghood:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqxmg9w0gt"
        );

        Ok(())
    }

    #[test]
    fn test_from_hash4() {
        let addr = CashAddress::from_hash(
            "ectest",
            AddressType::P2SH,
            ShaRmd160::from_be_hex(&"0".repeat(40)).unwrap(),
        );
        assert_eq!(
            addr.as_str(),
            "ectest:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpsqjtw32"
        );
    }

    #[test]
    fn test_from_hash5() {
        let addr = CashAddress::from_hash(
            "ecregtest",
            AddressType::P2SH,
            ShaRmd160::from_be_hex(&"0".repeat(40)).unwrap(),
        );
        assert_eq!(
            addr.as_str(),
            "ecregtest:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq0xzmurdk"
        );
    }

    #[test]
    fn test_from_hash6() {
        let addr = CashAddress::from_hash(
            "etoken",
            AddressType::P2SH,
            ShaRmd160::from_be_hex(&"0".repeat(40)).unwrap(),
        );
        assert_eq!(
            addr.as_str(),
            "etoken:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqf9hs6ykv"
        );
    }

    #[test]
    fn test_parse1() -> Result<(), CashAddressError> {
        let addr: CashAddress =
            "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx".parse()?;
        assert_eq!(addr.addr_type(), AddressType::P2PKH);
        assert_eq!(
            addr.as_str(),
            "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx"
        );
        assert_eq!(
            addr.hash(),
            &ShaRmd160::from_be_hex(&"0".repeat(40)).unwrap()
        );
        assert_eq!(addr.prefix(), "ecash");
        Ok(())
    }

    #[test]
    fn test_parse3() -> Result<(), CashAddressError> {
        let addr: CashAddress =
            "ecash:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8m7jvrjm".parse()?;
        assert_eq!(addr.addr_type(), AddressType::P2SH);
        assert_eq!(
            addr.as_str(),
            "ecash:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8m7jvrjm"
        );
        assert_eq!(
            addr.hash(),
            &ShaRmd160::from_be_hex(&"0".repeat(40)).unwrap()
        );
        assert_eq!(addr.prefix(), "ecash");
        Ok(())
    }

    #[test]
    fn test_parse4() -> Result<(), CashAddressError> {
        let addr: CashAddress = "redridinghood:\
                                 pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqxmg9w0gt"
            .parse()?;
        assert_eq!(addr.addr_type(), AddressType::P2SH);
        assert_eq!(
            addr.as_str(),
            "redridinghood:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqxmg9w0gt"
        );
        assert_eq!(
            addr.hash(),
            &ShaRmd160::from_be_hex(&"0".repeat(40)).unwrap()
        );
        assert_eq!(addr.prefix(), "redridinghood");
        Ok(())
    }

    #[test]
    fn test_parse_fail_wrong_prefix() {
        let err = "wrongprefix:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfnhks603"
            .parse::<CashAddress>()
            .unwrap_err();
        match err {
            CashAddressError::InvalidChecksum => {}
            _ => panic!("Unexpected error: {}", err),
        }
    }

    #[test]
    fn test_parse_fail_no_prefix() {
        let err = "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqfnhks603"
            .parse::<CashAddress>()
            .unwrap_err();
        match err {
            CashAddressError::MissingPrefix => {}
            _ => panic!("Unexpected error: {}", err),
        }
    }

    #[test]
    fn test_parse_fail_invalid_type() {
        let err = "ecash:zqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqh5sr9xk4"
            .parse::<CashAddress>()
            .unwrap_err();
        match err {
            CashAddressError::InvalidAddressType(16) => {}
            _ => panic!("Unexpected error: {}", err),
        }
    }

    #[test]
    fn test_parse_fail_invalid_payload_length() {
        let err = "ecash:pqqqqqqqqqqqqqqqqqqqqqqqqlgq7v"
            .parse::<CashAddress>()
            .unwrap_err();
        match err {
            CashAddressError::InvalidPayloadLength(12) => {}
            _ => panic!("Unexpected error: {}", err),
        }
    }

    #[test]
    fn test_from_redeem_script() -> Result<(), abc_rust_error::Report> {
        let addr = CashAddress::from_redeem_script(
            "ecash",
            Script::new(Bytes::from_static(&[0x51])),
        );

        let decoded_hash = decode("4b5acd30ba7ec77199561afa0bbd49b5e94517da")?;

        let sha_rmd160_hash = ShaRmd160::from_be_slice(&decoded_hash)?;

        assert_eq!(addr.addr_type(), AddressType::P2SH);
        assert_eq!(
            addr.as_str(),
            "ecash:prdpw30fk4ym6zl6rftfjuw806arpn26fv744447ex"
        );
        assert_eq!(addr.hash(), &sha_rmd160_hash);
        assert_eq!(addr.prefix(), "ecash");

        Ok(())
    }

    #[test]
    fn test_with_prefix() -> Result<(), CashAddressError> {
        let addr: CashAddress = "redridinghood:\
                                 pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqxmg9w0gt"
            .parse()?;
        let new_addr = addr.with_prefix("prelude");
        assert_eq!(new_addr.addr_type(), AddressType::P2SH);
        assert_eq!(
            new_addr.as_str(),
            "prelude:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqrs52h40n"
        );
        assert_eq!(
            new_addr.hash(),
            &ShaRmd160::from_be_hex(&"0".repeat(40)).unwrap()
        );
        assert_eq!(new_addr.prefix(), "prelude");
        Ok(())
    }

    #[test]
    fn test_to_script_p2sh() -> Result<(), CashAddressError> {
        let addr: CashAddress =
            "ecash:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8m7jvrjm".parse()?;
        assert_eq!(
            addr.to_script().bytecode().as_ref(),
            &[
                0xa9, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0x87
            ]
        );
        Ok(())
    }

    #[test]
    fn test_to_script_p2pkh() -> Result<(), CashAddressError> {
        let addr: CashAddress =
            "ecash:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7ratqfx".parse()?;
        assert_eq!(
            addr.to_script().bytecode().as_ref(),
            &[
                0x76, 0xa9, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0x88, 0xac
            ]
        );
        Ok(())
    }
}
