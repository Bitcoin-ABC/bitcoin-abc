// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::block::BlockHash;
use rocksdb::ColumnFamilyDescriptor;
use serde::{Deserialize, Serialize};

use crate::db::{Db, CF, CF_BLK};

/// Height of a block in the chain. Genesis block has height 0.
/// -1 indicates "not part of the chain".
pub type BlockHeight = i32;

/// Writes block data to the database.
pub struct BlockWriter<'a> {
    cf: &'a CF,
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

fn bh_to_bytes(height: BlockHeight) -> [u8; 4] {
    // big-endian, so blocks are sorted ascendingly
    height.to_be_bytes()
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
        // Use `postcard` to serialize the block data
        let data = postcard::to_allocvec(&SerBlock {
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

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use bitcoinsuite_core::block::BlockHash;

    use crate::{
        db::{Db, CF_BLK},
        io::{blocks::SerBlock, BlockWriter, DbBlock},
    };

    #[test]
    fn test_blocks() -> Result<()> {
        abc_rust_error::install();

        let tempdir = tempdir::TempDir::new("chronik-db--blocks")?;
        let db = Db::open(tempdir.path())?;
        let writer = BlockWriter::new(&db)?;
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
                postcard::from_bytes::<SerBlock>(
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
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            writer.insert(&mut batch, &block1)?;
            db.write_batch(batch)?;
            assert_eq!(
                postcard::from_bytes::<SerBlock>(
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
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            writer.delete_by_height(&mut batch, 1)?;
            db.write_batch(batch)?;
            assert_eq!(db.get(cf, [0, 0, 0, 1])?.as_deref(), None);
            assert!(db.get(cf, [0, 0, 0, 0])?.is_some());
        }
        {
            let mut batch = rocksdb::WriteBatch::default();
            writer.delete_by_height(&mut batch, 0)?;
            db.write_batch(batch)?;
            assert_eq!(db.get(cf, [0, 0, 0, 1])?.as_deref(), None);
            assert_eq!(db.get(cf, [0, 0, 0, 0])?.as_deref(), None);
        }
        Ok(())
    }
}
