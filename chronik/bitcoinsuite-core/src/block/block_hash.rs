// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use crate::{
    error::DataError,
    hash::{Hashed, Sha256d},
};

/// Wraps a block hash's [`Sha256d`], to avoid mixing different kinds of hashes.
/// Block hashes are always represented with a big-endian hex string, but stored
/// in little-endian byteorder.
#[derive(Clone, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct BlockHash(Sha256d);

impl std::fmt::Debug for BlockHash {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "BlockHash({})", self.0.hex_be())
    }
}

impl std::fmt::Display for BlockHash {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.hex_be().fmt(f)
    }
}

impl BlockHash {
    /// Returns the block hash bytes in little-endian byte order.
    ///
    /// ```
    /// # use bitcoinsuite_core::{block::BlockHash, hash::{Sha256d, Hashed}};
    /// # use hex_literal::hex;
    /// let hash = hex!(
    ///     "6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000"
    /// );
    /// let block_hash = BlockHash::from(Sha256d(hash));
    /// assert_eq!(block_hash.to_bytes(), hash);
    /// ```
    pub fn to_bytes(&self) -> [u8; 32] {
        self.0.to_le_bytes()
    }

    /// Returns the block hash as [`Vec<u8>`] in little-endian byte order.
    ///
    /// ```
    /// # use bitcoinsuite_core::{block::BlockHash, hash::{Sha256d, Hashed}};
    /// # use hex_literal::hex;
    /// let hash = hex!(
    ///     "6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000"
    /// );
    /// let block_hash = BlockHash::from(Sha256d(hash));
    /// assert_eq!(block_hash.to_vec(), hash.to_vec());
    /// ```
    pub fn to_vec(&self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }
}

impl std::str::FromStr for BlockHash {
    type Err = DataError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(BlockHash(Sha256d::from_be_hex(s)?))
    }
}

impl TryFrom<&'_ [u8]> for BlockHash {
    type Error = DataError;

    fn try_from(value: &'_ [u8]) -> Result<Self, Self::Error> {
        Ok(BlockHash(Sha256d::from_le_slice(value)?))
    }
}

impl From<[u8; 32]> for BlockHash {
    fn from(array: [u8; 32]) -> Self {
        BlockHash(Sha256d(array))
    }
}

impl From<Sha256d> for BlockHash {
    fn from(hash: Sha256d) -> Self {
        BlockHash(hash)
    }
}

impl AsRef<[u8]> for BlockHash {
    fn as_ref(&self) -> &[u8] {
        self.0.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use hex_literal::hex;

    use crate::{
        block::BlockHash,
        error::DataError,
        hash::{Hashed, Sha256d},
    };

    const GENESIS_HASH_HEX: &str =
        "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f";

    fn genesis_hash() -> Sha256d {
        let genesis_hash = hex!(
            "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
        );
        Sha256d::from_be_bytes(genesis_hash)
    }

    #[test]
    fn test_parse() -> Result<(), DataError> {
        let block_hash = GENESIS_HASH_HEX.parse::<BlockHash>()?;
        assert_eq!(block_hash, BlockHash::from(genesis_hash()));
        Ok(())
    }

    #[test]
    fn test_parse_fail() {
        assert_eq!(
            "abcd".parse::<BlockHash>(),
            Err(DataError::InvalidLength {
                expected: 32,
                actual: 2,
            }),
        );
    }

    #[test]
    fn test_try_from_slice() {
        let hash = genesis_hash();
        let slice = hash.as_le_bytes().as_ref();
        let block_hash: BlockHash = slice.try_into().unwrap();
        assert_eq!(block_hash, BlockHash::from(hash));
        assert_eq!(
            BlockHash::try_from(b"ab".as_ref()),
            Err(DataError::InvalidLength {
                expected: 32,
                actual: 2,
            }),
        );
    }

    #[test]
    fn test_debug() {
        assert_eq!(
            format!("{:?}", BlockHash::from(genesis_hash())),
            format!("BlockHash({})", GENESIS_HASH_HEX),
        );
    }

    #[test]
    fn test_display() -> Result<(), DataError> {
        assert_eq!(
            BlockHash::from(genesis_hash()).to_string(),
            GENESIS_HASH_HEX,
        );
        Ok(())
    }
}
