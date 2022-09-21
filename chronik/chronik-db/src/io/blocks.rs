// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::block::BlockHash;
use rocksdb::ColumnFamilyDescriptor;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    db::{Db, CF, CF_BLK},
    ser::{db_deserialize, db_serialize},
};

/// Height of a block in the chain. Genesis block has height 0.
/// -1 indicates "not part of the chain".
pub type BlockHeight = i32;

/// Writes block data to the database.
pub struct BlockWriter<'a> {
    cf: &'a CF,
}

/// Reads block data ([`DbBlock`]) from the database.
pub struct BlockReader<'a> {
    db: &'a Db,
}

/// Block data to/from the database.
#[derive(Clone, Debug, Eq, PartialEq, Hash, Default)]
pub struct DbBlock {
    /// Hash of the block.
    pub hash: BlockHash,
    /// Hash of the previous block of the block.
    pub prev_hash: BlockHash,
    /// Height of the block in the chain.
    pub height: BlockHeight,
    /// `nBits` field of the block; encodes the target compactly.
    pub n_bits: u32,
    /// Timestamp field of the block.
    pub timestamp: i64,
    /// Number of the node's blk?????.dat flat file where the block is stored.
    pub file_num: u32,
    /// Location in the flat file where the first byte of the block is stored,
    /// starting at the header.
    pub data_pos: u32,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
struct SerBlock {
    hash: [u8; 32],
    n_bits: u32,
    timestamp: i64,
    file_num: u32,
    data_pos: u32,
}

/// Errors for [`BlockWriter`] and [`BlockReader`].
#[derive(Debug, Error, PartialEq)]
pub enum BlocksError {
    /// Block height must be 4 bytes.
    #[error("Inconsistent DB: Invalid height bytes: {0:?}")]
    InvalidHeightBytes(Vec<u8>),

    /// Block has no parent.
    #[error("Inconsistent DB: Orphan block at height {0}")]
    OrphanBlock(BlockHeight),
}

use self::BlocksError::*;

fn bh_to_bytes(height: BlockHeight) -> [u8; 4] {
    // big-endian, so blocks are sorted ascendingly
    height.to_be_bytes()
}

fn bytes_to_bh(bytes: &[u8]) -> Result<BlockHeight> {
    Ok(BlockHeight::from_be_bytes(
        bytes
            .try_into()
            .map_err(|_| InvalidHeightBytes(bytes.to_vec()))?,
    ))
}

impl<'a> BlockWriter<'a> {
    /// Create writer to the database for blocks.
    pub fn new(db: &'a Db) -> Result<Self> {
        let cf = db.cf(CF_BLK)?;
        Ok(BlockWriter { cf })
    }

    /// Add a new block to the database.
    pub fn insert(
        &self,
        batch: &mut rocksdb::WriteBatch,
        block: &DbBlock,
    ) -> Result<()> {
        // Serialize the block data
        let data = db_serialize(&SerBlock {
            hash: block.hash.to_bytes(),
            n_bits: block.n_bits,
            timestamp: block.timestamp,
            file_num: block.file_num,
            data_pos: block.data_pos,
        })?;
        batch.put_cf(self.cf, bh_to_bytes(block.height), &data);
        Ok(())
    }

    /// Remove a block by height from the database.
    pub fn delete_by_height(
        &self,
        batch: &mut rocksdb::WriteBatch,
        height: BlockHeight,
    ) -> Result<()> {
        batch.delete_cf(self.cf, bh_to_bytes(height));
        Ok(())
    }

    pub(crate) fn add_cfs(columns: &mut Vec<ColumnFamilyDescriptor>) {
        columns.push(ColumnFamilyDescriptor::new(
            CF_BLK,
            rocksdb::Options::default(),
        ));
    }
}

impl std::fmt::Debug for BlockWriter<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "BlockWriter {{ ... }}")
    }
}

impl<'a> BlockReader<'a> {
    /// Create reader from the database for blocks.
    pub fn new(db: &'a Db) -> Result<Self> {
        db.cf(CF_BLK)?;
        Ok(BlockReader { db })
    }

    /// The height of the most-work fully-validated chain. The genesis block has
    /// height 0
    pub fn height(&self) -> Result<BlockHeight> {
        let mut iter = self.db.iterator_end(self.cf());
        match iter.next() {
            Some(result) => {
                let (height_bytes, _) = result?;
                Ok(bytes_to_bh(&height_bytes)?)
            }
            None => Ok(-1),
        }
    }

    /// Tip of the chain: the most recently added block.
    /// [`None`] if chain is empty (not even the genesis block).
    pub fn tip(&self) -> Result<Option<DbBlock>> {
        let mut iter = self.db.iterator_end(self.cf());
        match iter.next() {
            Some(result) => {
                let (height_bytes, block_data) = result?;
                let height = bytes_to_bh(&height_bytes)?;
                let block_data = db_deserialize::<SerBlock>(&block_data)?;
                let prev_block_hash = self.get_prev_hash(height)?;
                Ok(Some(DbBlock {
                    hash: BlockHash::from(block_data.hash),
                    prev_hash: BlockHash::from(prev_block_hash),
                    height,
                    n_bits: block_data.n_bits,
                    timestamp: block_data.timestamp,
                    file_num: block_data.file_num,
                    data_pos: block_data.data_pos,
                }))
            }
            None => Ok(None),
        }
    }

    /// [`DbBlock`] by height. The genesis block has height 0.
    pub fn by_height(&self, height: BlockHeight) -> Result<Option<DbBlock>> {
        let block_data = self.db.get(self.cf(), bh_to_bytes(height))?;
        let block_data = match &block_data {
            Some(block_data) => db_deserialize::<SerBlock>(block_data)?,
            None => return Ok(None),
        };
        let prev_block_hash = self.get_prev_hash(height)?;
        Ok(Some(DbBlock {
            hash: BlockHash::from(block_data.hash),
            prev_hash: BlockHash::from(prev_block_hash),
            height,
            n_bits: block_data.n_bits,
            timestamp: block_data.timestamp,
            file_num: block_data.file_num,
            data_pos: block_data.data_pos,
        }))
    }

    fn get_prev_hash(&self, height: BlockHeight) -> Result<[u8; 32]> {
        if height == 0 {
            return Ok([0; 32]);
        }
        let prev_block_data = self
            .db
            .get(self.cf(), bh_to_bytes(height - 1))?
            .ok_or(OrphanBlock(height))?;
        let prev_block = db_deserialize::<SerBlock>(&prev_block_data)?;
        Ok(prev_block.hash)
    }

    fn cf(&self) -> &CF {
        self.db.cf(CF_BLK).unwrap()
    }
}

impl std::fmt::Debug for BlockReader<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "BlockReader {{ ... }}")
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use bitcoinsuite_core::block::BlockHash;

    use crate::{
        db::{Db, CF_BLK},
        io::{
            blocks::SerBlock, BlockReader, BlockWriter, BlocksError, DbBlock,
        },
        ser::{db_deserialize, SerError},
    };

    #[test]
    fn test_blocks() -> Result<()> {
        abc_rust_error::install();

        let tempdir = tempdir::TempDir::new("chronik-db--blocks")?;
        let db = Db::open(tempdir.path())?;
        let writer = BlockWriter::new(&db)?;
        let blocks = BlockReader::new(&db)?;
        {
            assert_eq!(blocks.height()?, -1);
            assert_eq!(blocks.tip()?, None);
            assert_eq!(blocks.by_height(0)?, None);
        }
        let block0 = DbBlock {
            hash: BlockHash::from([44; 32]),
            prev_hash: BlockHash::from([0; 32]),
            height: 0,
            n_bits: 0x1c100000,
            timestamp: 1600000000,
            file_num: 6,
            data_pos: 100,
        };
        let block1 = DbBlock {
            hash: BlockHash::from([22; 32]),
            prev_hash: BlockHash::from([44; 32]),
            height: 1,
            n_bits: 0x1c100001,
            timestamp: 1600000001,
            file_num: 7,
            data_pos: 200,
        };
        let cf = db.cf(CF_BLK)?;
        {
            let mut batch = rocksdb::WriteBatch::default();
            writer.insert(&mut batch, &block0)?;
            db.write_batch(batch)?;
            assert_eq!(
                db_deserialize::<SerBlock>(
                    &db.get(cf, [0, 0, 0, 0])?.unwrap()
                )?,
                SerBlock {
                    hash: block0.hash.to_bytes(),
                    n_bits: block0.n_bits,
                    timestamp: block0.timestamp,
                    file_num: block0.file_num,
                    data_pos: block0.data_pos,
                },
            );
            assert_eq!(blocks.height()?, 0);
            assert_eq!(blocks.tip()?, Some(block0.clone()));
            assert_eq!(blocks.by_height(0)?, Some(block0.clone()));
            assert_eq!(blocks.by_height(1)?, None);
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            writer.insert(&mut batch, &block1)?;
            db.write_batch(batch)?;
            assert_eq!(
                db_deserialize::<SerBlock>(
                    &db.get(cf, [0, 0, 0, 1])?.unwrap(),
                )?,
                SerBlock {
                    hash: block1.hash.to_bytes(),
                    n_bits: block1.n_bits,
                    timestamp: block1.timestamp,
                    file_num: block1.file_num,
                    data_pos: block1.data_pos,
                },
            );
            assert_eq!(blocks.height()?, 1);
            assert_eq!(blocks.tip()?, Some(block1.clone()));
            assert_eq!(blocks.by_height(0)?, Some(block0.clone()));
            assert_eq!(blocks.by_height(1)?, Some(block1));
            assert_eq!(blocks.by_height(2)?, None);
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            writer.delete_by_height(&mut batch, 1)?;
            db.write_batch(batch)?;
            assert_eq!(db.get(cf, [0, 0, 0, 1])?.as_deref(), None);
            assert!(db.get(cf, [0, 0, 0, 0])?.is_some());
            assert_eq!(blocks.height()?, 0);
            assert_eq!(blocks.tip()?, Some(block0.clone()));
            assert_eq!(blocks.by_height(0)?, Some(block0));
            assert_eq!(blocks.by_height(1)?, None);
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            writer.delete_by_height(&mut batch, 0)?;
            db.write_batch(batch)?;
            assert_eq!(db.get(cf, [0, 0, 0, 1])?.as_deref(), None);
            assert_eq!(db.get(cf, [0, 0, 0, 0])?.as_deref(), None);
            assert_eq!(blocks.height()?, -1);
            assert_eq!(blocks.tip()?, None);
            assert_eq!(blocks.by_height(0)?, None);
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            batch.put_cf(cf, [0, 0, 0], []);
            db.write_batch(batch)?;
            assert_eq!(
                blocks.height().unwrap_err().downcast::<BlocksError>()?,
                BlocksError::InvalidHeightBytes(vec![0, 0, 0]),
            );
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            batch.put_cf(cf, [0, 0, 0, 0], [0xff, 0xff, 0xff]);
            db.write_batch(batch)?;
            assert_eq!(
                blocks.by_height(0).unwrap_err().downcast::<SerError>()?,
                SerError::DeserializeError {
                    type_name: "chronik_db::io::blocks::SerBlock",
                    error: postcard::Error::DeserializeUnexpectedEnd,
                    bytes: vec![0xff, 0xff, 0xff],
                },
            );
        }
        Ok(())
    }
}
