// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::block::BlockHash;
use rocksdb::ColumnFamilyDescriptor;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    db::{Db, CF, CF_BLK, CF_LOOKUP_BLK_BY_HASH},
    reverse_lookup::{LookupColumn, ReverseLookup},
    ser::{db_deserialize, db_serialize},
};

/// Height of a block in the chain. Genesis block has height 0.
/// -1 indicates "not part of the chain".
pub type BlockHeight = i32;

struct BlockColumn<'a> {
    db: &'a Db,
    cf_blk: &'a CF,
}

/// Writes block data to the database.
pub struct BlockWriter<'a> {
    col: BlockColumn<'a>,
}

/// Reads block data ([`DbBlock`]) from the database.
pub struct BlockReader<'a> {
    col: BlockColumn<'a>,
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

type LookupByHash<'a> = ReverseLookup<BlockColumn<'a>>;

impl LookupColumn for BlockColumn<'_> {
    type CheapHash = [u8; 4];
    type Data = SerBlock;
    type SerialNum = BlockHeight;

    const CF_DATA: &'static str = CF_BLK;
    const CF_INDEX: &'static str = CF_LOOKUP_BLK_BY_HASH;

    fn cheap_hash(key: &[u8; 32]) -> Self::CheapHash {
        // use the lowest 32 bits of seashash as hash
        (seahash::hash(key) as u32).to_be_bytes()
    }

    fn data_key(data: &SerBlock) -> &[u8; 32] {
        &data.hash
    }

    fn get_data(&self, block_height: BlockHeight) -> Result<Option<SerBlock>> {
        self.get_block(block_height)
    }

    fn get_data_multi(
        &self,
        block_heights: impl IntoIterator<Item = Self::SerialNum>,
    ) -> Result<Vec<Option<Self::Data>>> {
        let data_ser = self.db.multi_get(
            self.cf_blk,
            block_heights.into_iter().map(bh_to_bytes),
            false,
        )?;
        data_ser
            .into_iter()
            .map(|data_ser| {
                data_ser
                    .map(|data_ser| db_deserialize::<SerBlock>(&data_ser))
                    .transpose()
            })
            .collect::<_>()
    }
}

/// Errors for [`BlockWriter`] and [`BlockReader`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum BlocksError {
    /// Block height must be 4 bytes.
    #[error("Inconsistent DB: Invalid height bytes: {0:?}")]
    InvalidHeightBytes(Vec<u8>),

    /// Block has no parent.
    #[error("Inconsistent DB: Orphan block at height {0}")]
    OrphanBlock(BlockHeight),
}

use self::BlocksError::*;

/// Serialize block height for using it as keys in the DB.
/// Big-endian, so blocks are sorted ascendingly.
pub(crate) fn bh_to_bytes(height: BlockHeight) -> [u8; 4] {
    height.to_be_bytes()
}

/// Deserialize block height from bytes.
pub(crate) fn bytes_to_bh(bytes: &[u8]) -> Result<BlockHeight> {
    Ok(BlockHeight::from_be_bytes(
        bytes
            .try_into()
            .map_err(|_| InvalidHeightBytes(bytes.to_vec()))?,
    ))
}

impl<'a> BlockColumn<'a> {
    fn new(db: &'a Db) -> Result<Self> {
        let cf_blk = db.cf(CF_BLK)?;
        db.cf(CF_LOOKUP_BLK_BY_HASH)?;
        Ok(BlockColumn { db, cf_blk })
    }

    fn get_block(&self, block_height: BlockHeight) -> Result<Option<SerBlock>> {
        match self.db.get(self.cf_blk, bh_to_bytes(block_height))? {
            Some(bytes) => Ok(Some(db_deserialize::<SerBlock>(&bytes)?)),
            None => Ok(None),
        }
    }
}

impl<'a> BlockWriter<'a> {
    /// Create writer to the database for blocks.
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(BlockWriter {
            col: BlockColumn::new(db)?,
        })
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
        batch.put_cf(self.col.cf_blk, bh_to_bytes(block.height), &data);
        LookupByHash::insert_pairs(
            self.col.db,
            batch,
            [(block.height, &block.hash.to_bytes())],
        )?;
        Ok(())
    }

    /// Remove a block by height from the database.
    pub fn delete(
        &self,
        batch: &mut rocksdb::WriteBatch,
        block: &DbBlock,
    ) -> Result<()> {
        batch.delete_cf(self.col.cf_blk, bh_to_bytes(block.height));
        LookupByHash::delete_pairs(
            self.col.db,
            batch,
            [(block.height, &block.hash.to_bytes())],
        )?;
        Ok(())
    }

    pub(crate) fn add_cfs(columns: &mut Vec<ColumnFamilyDescriptor>) {
        columns.push(ColumnFamilyDescriptor::new(
            CF_BLK,
            rocksdb::Options::default(),
        ));
        LookupByHash::add_cfs(columns);
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
        Ok(BlockReader {
            col: BlockColumn::new(db)?,
        })
    }

    /// The height of the most-work fully-validated chain. The genesis block has
    /// height 0
    pub fn height(&self) -> Result<BlockHeight> {
        let mut iter = self.col.db.iterator_end(self.col.cf_blk);
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
        let mut iter = self.col.db.iterator_end(self.col.cf_blk);
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
        let Some(block_data) = self.col.get_block(height)? else {
            return Ok(None);
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

    /// [`DbBlock`] by hash.
    pub fn by_hash(&self, hash: &BlockHash) -> Result<Option<DbBlock>> {
        let hash = hash.to_bytes();
        let (height, ser_block) =
            match LookupByHash::get(&self.col, self.col.db, &hash)? {
                Some(data) => data,
                None => return Ok(None),
            };
        Ok(Some(DbBlock {
            hash: BlockHash::from(ser_block.hash),
            prev_hash: BlockHash::from(self.get_prev_hash(height)?),
            height,
            n_bits: ser_block.n_bits,
            timestamp: ser_block.timestamp,
            file_num: ser_block.file_num,
            data_pos: ser_block.data_pos,
        }))
    }

    fn get_prev_hash(&self, height: BlockHeight) -> Result<[u8; 32]> {
        if height == 0 {
            return Ok([0; 32]);
        }
        let prev_block_data = self
            .col
            .db
            .get(self.col.cf_blk, bh_to_bytes(height - 1))?
            .ok_or(OrphanBlock(height))?;
        let prev_block = db_deserialize::<SerBlock>(&prev_block_data)?;
        Ok(prev_block.hash)
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
            assert_eq!(blocks.by_height(1)?, Some(block1.clone()));
            assert_eq!(blocks.by_height(2)?, None);
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            writer.delete(&mut batch, &block1)?;
            db.write_batch(batch)?;
            assert_eq!(db.get(cf, [0, 0, 0, 1])?.as_deref(), None);
            assert!(db.get(cf, [0, 0, 0, 0])?.is_some());
            assert_eq!(blocks.height()?, 0);
            assert_eq!(blocks.tip()?, Some(block0.clone()));
            assert_eq!(blocks.by_height(0)?, Some(block0.clone()));
            assert_eq!(blocks.by_height(1)?, None);
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            writer.delete(&mut batch, &block0)?;
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
