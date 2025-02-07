// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use rocksdb::ColumnFamilyDescriptor;
use serde::{Deserialize, Serialize};

use crate::{
    db::{Db, CF, CF_BLK_STATS},
    index_tx::IndexTx,
    io::{bh_to_bytes, BlockHeight},
    ser::{db_deserialize, db_serialize},
};

/// Statistics about a block, like num txs, block size, etc.
#[derive(
    Clone, Debug, Default, Deserialize, Eq, Hash, PartialEq, Serialize,
)]
pub struct BlockStats {
    /// Block size of this block in bytes (including headers etc.)
    pub block_size: u64,
    /// Number of txs in this block
    pub num_txs: u64,
    /// Total number of tx inputs in block (including coinbase)
    pub num_inputs: u64,
    /// Total number of tx output in block (including coinbase)
    pub num_outputs: u64,
    /// Total number of satoshis spent by tx inputs
    pub sum_input_sats: i64,
    /// Block reward for this block
    pub sum_coinbase_output_sats: i64,
    /// Total number of satoshis in non-coinbase tx outputs
    pub sum_normal_output_sats: i64,
    /// Total number of satoshis burned using OP_RETURN
    pub sum_burned_sats: i64,
}

struct BlockStatsColumn<'a> {
    db: &'a Db,
    cf: &'a CF,
}

/// Write [`BlockStats`] to the DB.
#[derive(Debug)]
pub struct BlockStatsWriter<'a> {
    col: BlockStatsColumn<'a>,
}

/// Read [`BlockStats`] from the DB.
#[derive(Debug)]
pub struct BlockStatsReader<'a> {
    col: BlockStatsColumn<'a>,
}

impl<'a> BlockStatsColumn<'a> {
    fn new(db: &'a Db) -> Result<Self> {
        let cf = db.cf(CF_BLK_STATS)?;
        Ok(BlockStatsColumn { db, cf })
    }
}

impl<'a> BlockStatsWriter<'a> {
    /// Create a new [`BlockStatsWriter`].
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(BlockStatsWriter {
            col: BlockStatsColumn::new(db)?,
        })
    }

    /// Measure the [`BlockStats`] of the block with the given the block txs and
    /// add them to the `WriteBatch`.
    pub fn insert(
        &self,
        batch: &mut rocksdb::WriteBatch,
        block_height: BlockHeight,
        block_size: u64,
        txs: &[IndexTx<'_>],
    ) -> Result<()> {
        let mut num_inputs = 0;
        let mut num_outputs = 0;
        let mut sum_input_sats = 0;
        let mut sum_normal_output_sats = 0;
        let mut sum_coinbase_output_sats = 0;
        let mut sum_burned_sats = 0;
        for tx in txs {
            for output in &tx.tx.outputs {
                if output.script.is_opreturn() {
                    sum_burned_sats += output.sats;
                }
            }
            let tx_output_sats =
                tx.tx.outputs.iter().map(|output| output.sats).sum::<i64>();
            if tx.is_coinbase {
                sum_coinbase_output_sats += tx_output_sats;
            } else {
                sum_normal_output_sats += tx_output_sats;
                for input in &tx.tx.inputs {
                    if let Some(coin) = input.coin.as_ref() {
                        sum_input_sats += coin.output.sats;
                    }
                }
            }
            num_inputs += tx.tx.inputs.len();
            num_outputs += tx.tx.outputs.len();
        }
        let stats = BlockStats {
            block_size,
            num_txs: txs.len() as u64,
            num_inputs: num_inputs as u64,
            num_outputs: num_outputs as u64,
            sum_input_sats,
            sum_coinbase_output_sats,
            sum_normal_output_sats,
            sum_burned_sats,
        };
        batch.put_cf(
            self.col.cf,
            bh_to_bytes(block_height),
            db_serialize(&stats)?,
        );
        Ok(())
    }

    /// Delete the block stats for the block with the given height.
    pub fn delete(
        &self,
        batch: &mut rocksdb::WriteBatch,
        block_height: BlockHeight,
    ) {
        batch.delete_cf(self.col.cf, bh_to_bytes(block_height));
    }

    pub(crate) fn add_cfs(columns: &mut Vec<ColumnFamilyDescriptor>) {
        columns.push(ColumnFamilyDescriptor::new(
            CF_BLK_STATS,
            rocksdb::Options::default(),
        ));
    }
}

impl<'a> BlockStatsReader<'a> {
    /// Create a new [`BlockStatsReader`].
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(BlockStatsReader {
            col: BlockStatsColumn::new(db)?,
        })
    }

    /// Read the [`BlockStats`] from the DB, or [`None`] if the block doesn't
    /// exist.
    pub fn by_height(
        &self,
        block_height: BlockHeight,
    ) -> Result<Option<BlockStats>> {
        match self.col.db.get(self.col.cf, bh_to_bytes(block_height))? {
            Some(ser_block_stats) => {
                Ok(Some(db_deserialize::<BlockStats>(&ser_block_stats)?))
            }
            None => Ok(None),
        }
    }
}

impl std::fmt::Debug for BlockStatsColumn<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "BlockStatsColumn {{ .. }}")
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use bitcoinsuite_core::{
        script::{opcode::*, ScriptMut},
        tx::{Tx, TxId, TxMut, TxOutput},
    };
    use pretty_assertions::assert_eq;
    use rocksdb::WriteBatch;

    use crate::{
        db::Db,
        index_tx::prepare_indexed_txs,
        io::{
            BlockStats, BlockStatsReader, BlockStatsWriter, BlockTxs, TxEntry,
            TxWriter, TxsMemData,
        },
        test::make_inputs_tx,
    };

    #[test]
    fn test_block_stats() -> Result<()> {
        let tempdir = tempdir::TempDir::new("chronik-db--block_stats")?;
        let mut cfs = Vec::new();
        TxWriter::add_cfs(&mut cfs);
        BlockStatsWriter::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;
        let tx_writer = TxWriter::new(&db)?;
        let mut txs_mem_data = TxsMemData::default();
        let stats_writer = BlockStatsWriter::new(&db)?;
        let stats_reader = BlockStatsReader::new(&db)?;

        let block = vec![
            make_inputs_tx(0x01, [(0x00, u32::MAX, 0xffff)], [50, 20]),
            make_inputs_tx(0x02, [(0x01, 0, 50)], [40, 10]),
            make_inputs_tx(
                0x03,
                [(0x02, 0, 40), (0x01, 1, 20), (0x02, 1, 10)],
                [60, 5],
            ),
            Tx::with_txid(
                TxId::from([0x05; 32]),
                TxMut {
                    version: 1,
                    inputs: make_inputs_tx(0, [(0x03, 0, 60)], [])
                        .inputs
                        .clone(),
                    outputs: vec![TxOutput {
                        sats: 60,
                        script: {
                            let mut script = ScriptMut::default();
                            script.put_opcodes([OP_RETURN, OP_1]);
                            script.freeze()
                        },
                    }],
                    locktime: 0,
                },
            ),
        ];

        let block_txs = block
            .iter()
            .map(|tx| TxEntry {
                txid: tx.txid(),
                ..Default::default()
            })
            .collect::<Vec<_>>();
        let mut batch = WriteBatch::default();
        let first_tx_num = tx_writer.insert(
            &mut batch,
            &BlockTxs {
                txs: block_txs,
                block_height: 1,
            },
            &mut txs_mem_data,
        )?;
        let index_txs = prepare_indexed_txs(&db, first_tx_num, &block)?;
        stats_writer.insert(&mut batch, 1, 1337, &index_txs)?;
        db.write_batch(batch)?;

        assert_eq!(
            stats_reader.by_height(1)?,
            Some(BlockStats {
                block_size: 1337,
                num_txs: 4,
                num_inputs: 6,
                num_outputs: 7,
                sum_input_sats: 180,
                sum_coinbase_output_sats: 70,
                sum_normal_output_sats: 175,
                sum_burned_sats: 60,
            }),
        );

        let mut batch = WriteBatch::default();
        stats_writer.delete(&mut batch, 1);
        db.write_batch(batch)?;

        assert_eq!(stats_reader.by_height(1)?, None);

        Ok(())
    }
}
