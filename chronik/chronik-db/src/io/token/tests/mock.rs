// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::{
    script::Script,
    tx::{Coin, OutPoint, Tx, TxId, TxInput, TxMut, TxOutput},
};
use bitcoinsuite_slp::{structs::Atoms, token_id::TokenId};
use rocksdb::WriteBatch;

use crate::{
    db::Db,
    index_tx::prepare_indexed_txs,
    io::{
        token::{DbToken, ProcessedTokenTxBatch, TokenWriter},
        BlockTxs, TxEntry, TxWriter, TxsMemData,
    },
};

pub(crate) struct MockTokenDb<'a> {
    pub(crate) db: &'a Db,
    block_height: i32,
}

pub(crate) fn token_id(num: u8) -> TokenId {
    TokenId::new(TxId::new([num; 32]))
}

pub(crate) fn db_atoms<const N: u32>(atoms: Atoms) -> DbToken {
    DbToken::Atoms(N, atoms)
}

pub(crate) fn db_baton<const N: u32>() -> DbToken {
    DbToken::MintBaton(N)
}

pub(crate) fn make_tx<const N: usize>(
    txid_num: u8,
    inputs: [(u8, u32); N],
    num_outputs: usize,
    op_return_script: Script,
) -> Tx {
    Tx::with_txid(
        TxId::from([txid_num; 32]),
        TxMut {
            version: 0,
            inputs: inputs
                .into_iter()
                .map(|(input_txid_num, out_idx)| TxInput {
                    prev_out: OutPoint {
                        txid: TxId::from([input_txid_num; 32]),
                        out_idx,
                    },
                    coin: Some(Coin {
                        output: TxOutput {
                            sats: 0,
                            script: Script::EMPTY,
                        },
                        ..Default::default()
                    }),
                    ..Default::default()
                })
                .collect(),
            outputs: [TxOutput {
                sats: 0,
                script: op_return_script,
            }]
            .into_iter()
            .chain((0..num_outputs).map(|_| TxOutput::default()))
            .collect(),
            locktime: 0,
        },
    )
}

pub(crate) fn make_tx_with_scripts<const N: usize>(
    txid_num: u8,
    inputs: [(u8, u32, Script); N],
    num_outputs: usize,
    op_return_script: Script,
) -> Tx {
    Tx::with_txid(
        TxId::from([txid_num; 32]),
        TxMut {
            version: 0,
            inputs: inputs
                .into_iter()
                .map(|(input_txid_num, out_idx, script)| TxInput {
                    prev_out: OutPoint {
                        txid: TxId::from([input_txid_num; 32]),
                        out_idx,
                    },
                    coin: Some(Coin {
                        output: TxOutput { sats: 0, script },
                        ..Default::default()
                    }),
                    ..Default::default()
                })
                .collect(),
            outputs: [TxOutput {
                sats: 0,
                script: op_return_script,
            }]
            .into_iter()
            .chain((0..num_outputs).map(|_| TxOutput::default()))
            .collect(),
            locktime: 0,
        },
    )
}

impl<'a> MockTokenDb<'a> {
    pub(crate) fn setup_db() -> Result<(Db, tempdir::TempDir)> {
        let tempdir = tempdir::TempDir::new("chronik-db--token")?;
        let mut cfs = Vec::new();
        TxWriter::add_cfs(&mut cfs);
        TokenWriter::add_cfs(&mut cfs);
        Ok((Db::open_with_cfs(tempdir.path(), cfs)?, tempdir))
    }

    pub(crate) fn setup(db: &'a Db) -> Result<Self> {
        Ok(MockTokenDb {
            db,
            block_height: -1,
        })
    }

    pub(crate) fn connect(
        &mut self,
        txs: &[Tx],
    ) -> Result<ProcessedTokenTxBatch> {
        let tx_writer = TxWriter::new(self.db)?;
        let token_writer = TokenWriter::new(self.db)?;
        let mut batch = WriteBatch::default();
        let mut txs_mem_data = TxsMemData::default();
        let first_tx_num = tx_writer.insert(
            &mut batch,
            &txs_batch(txs, self.block_height + 1),
            &mut txs_mem_data,
        )?;
        let index_txs = prepare_indexed_txs(self.db, first_tx_num, txs)?;
        let result = token_writer.insert(&mut batch, &index_txs)?;
        self.db.write_batch(batch)?;
        self.block_height += 1;
        Ok(result)
    }

    pub(crate) fn disconnect(&mut self, txs: &[Tx]) -> Result<()> {
        let tx_writer = TxWriter::new(self.db)?;
        let token_writer = TokenWriter::new(self.db)?;
        let mut batch = WriteBatch::default();
        let mut txs_mem_data = TxsMemData::default();
        let first_tx_num = tx_writer.delete(
            &mut batch,
            &txs_batch(txs, self.block_height),
            &mut txs_mem_data,
        )?;
        let index_txs = prepare_indexed_txs(self.db, first_tx_num, txs)?;
        token_writer.delete(&mut batch, &index_txs)?;
        self.db.write_batch(batch)?;
        self.block_height -= 1;
        Ok(())
    }
}

fn txs_batch(txs: &[Tx], block_height: i32) -> BlockTxs {
    BlockTxs {
        txs: txs
            .iter()
            .map(|tx| TxEntry {
                txid: tx.txid(),
                ..Default::default()
            })
            .collect(),
        block_height,
    }
}
