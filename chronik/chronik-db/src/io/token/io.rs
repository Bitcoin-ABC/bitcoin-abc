// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{BTreeMap, BTreeSet, HashMap};

use abc_rust_error::Result;
use bimap::BiMap;
use bitcoinsuite_core::tx::{OutPoint, Tx, TxId};
use bitcoinsuite_slp::{
    structs::{GenesisInfo, TokenMeta},
    verify::SpentToken,
};
use chronik_util::{log, log_chronik};
use rocksdb::WriteBatch;
use thiserror::Error;

use crate::{
    db::{Db, CF, CF_TOKEN_GENESIS_INFO, CF_TOKEN_META, CF_TOKEN_TX},
    index_tx::IndexTx,
    io::{
        bytes_to_tx_num,
        token::{
            BatchDbData, BatchProcessor, DbToken, DbTokenTx,
            ProcessedTokenTxBatch, TokenIndexError::*,
        },
        tx_num_to_bytes, BlockHeight, BlockReader, TxNum, TxReader,
    },
    ser::{db_deserialize, db_serialize},
};

struct TokenCol<'a> {
    db: &'a Db,
    cf_genesis_info: &'a CF,
    cf_token_meta: &'a CF,
    cf_token_tx: &'a CF,
}

/// Writes token data to the indexer.
///
/// Token data is split into these column families:
/// - cf_genesis_info: TxNum (of GENESIS tx) -> serialized [`GenesisInfo`]
/// - cf_token_meta: TxNum (of GENESIS tx) -> serialized [`TokenMeta`]
/// - cf_token_tx: TxNum -> serialized [`DbTokenTx`]
///
/// We serialize TxNum in big-endian 8 bytes (like TxWriter), to ensure they are
/// sorted in ascending order. This both allows us to use some optimized batch
/// queries, but it also allows us to iterate txs in block order, in case this
/// ever becomes useful.
///
/// In [`DbTokenTx`], we store token_tx_nums instead of hashes directly to save
/// space.
///
/// We only store color data of inputs and outputs and don't store tx types,
/// burn amounts, parsing/color/burn errors, etc., and only re-calculate them on
/// demand by calling color_tx/verify again, for these reasons:
/// - Reduces the size of the DB by only storing the "value" attached to each
///   input/output.
/// - Speeds up indexing when looking up spent input data by having each tx have
///   less data to read + deserialize
/// - Allows changing how burn amounts/errors are handled without having to
///   reindex the DB
///
/// Re-coloring/verifying is very quick if the token inputs are already
/// pre-processed in the DB.
///
/// In previous versions, we used a separate TokenNum counter for GENESIS txs,
/// in order to save space. However, here we use the TxNum directly, because the
/// added complexity of having to handle another counter and the TxNum/TokenNum
/// mapping was not worth the space savings. Also, while TxNums are objective
/// (based on mined block order), TokenNums are subjective, because they depend
/// on topological ordering, which can differ based on hash seeding and sorting
/// algorithm.
///
/// Verification happens in these steps:
/// 1. `prepare`: Parses and colors all txs in the DB, and split them into those
///    that color outputs and those that don't/non-token txs.
/// 2. `skip`: If the token DB is empty and the batch contains no GENESIS txs,
///    we can skip the entire batch and speed up indexing early blocks.
/// 3. `fetch_*`: Fetch all token data of all input txs and the [`TokenMeta`]s
///    used by them.
/// 4. `topo_sort`: Sort (only) the token txs in the batch topologically.
/// 5. `verify_token_tx`: Verify all token txs in topological order, update the
///    [`BatchDbData`] and collect the new data in [`ProcessedTokenTxBatch`].
/// 6. `process_non_token_tx`: Non-token txs can still burn token txs, add an
///    entry for them in the DB too if this is the case.
/// 7. `insert`: Insert the new token txs and for new tokens the new
///    [`TokenMeta`]/[`GenesisInfo`] to [`WriteBatch`].
#[derive(Debug)]
pub struct TokenWriter<'a> {
    col: TokenCol<'a>,
}

/// Read token data from the indexer
#[derive(Debug)]
pub struct TokenReader<'a> {
    col: TokenCol<'a>,
}

/// Error that occured when indexing tokens
#[derive(Debug, Error, PartialEq)]
pub enum TokenIndexError {
    /// token_tx_num was not found in the DB but should be there
    #[error("Inconsistent DB: Token TxNum {0} not found in DB")]
    TokenTxNumNotFound(TxNum),

    /// Block not found in the DB
    #[error("Inconsistent DB: Block {0} not found in DB for upgrade to 12")]
    BlockNotFound(BlockHeight),

    /// Tx not found in the DB
    #[error("Inconsistent DB: Tx {0} not found in DB for upgrade to 12")]
    TxNotFound(TxId),

    /// Token output not found in the DB
    #[error("Inconsistent DB: Token output doesn't exist for upgrade to 12")]
    TokenOutputDoesntExist(OutPoint),
}

impl<'a> TokenCol<'a> {
    fn new(db: &'a Db) -> Result<Self> {
        let cf_genesis_info = db.cf(CF_TOKEN_GENESIS_INFO)?;
        let cf_token_meta = db.cf(CF_TOKEN_META)?;
        let cf_token_tx = db.cf(CF_TOKEN_TX)?;
        Ok(TokenCol {
            db,
            cf_genesis_info,
            cf_token_meta,
            cf_token_tx,
        })
    }

    fn has_any_tokens(&self) -> Result<bool> {
        Ok(self
            .db
            .iterator(self.cf_token_meta, b"", rocksdb::Direction::Forward)
            .next()
            .transpose()?
            .is_some())
    }

    fn fetch_token_txs(
        &self,
        input_tx_nums: &BTreeSet<TxNum>,
    ) -> Result<Vec<(TxNum, DbTokenTx)>> {
        self.db
            .multi_get(
                self.cf_token_tx,
                input_tx_nums.iter().map(|&tx_num| tx_num_to_bytes(tx_num)),
                true,
            )?
            .into_iter()
            .zip(input_tx_nums)
            .filter_map(|(db_token_tx, &tx_num)| {
                Some(
                    db_deserialize::<DbTokenTx>(&db_token_tx?)
                        .map(|tx| (tx_num, tx)),
                )
            })
            .collect::<Result<Vec<_>>>()
    }

    fn fetch_token_metas(
        &self,
        token_tx_nums: &BTreeSet<TxNum>,
    ) -> Result<Vec<(TxNum, TokenMeta)>> {
        self.db
            .multi_get(
                self.cf_token_meta,
                token_tx_nums.iter().map(|&tx_num| tx_num_to_bytes(tx_num)),
                true,
            )?
            .into_iter()
            .zip(token_tx_nums)
            .map(|(db_token_meta, &token_tx_num)| {
                let db_token_meta =
                    db_token_meta.ok_or(TokenTxNumNotFound(token_tx_num))?;
                let db_token_meta =
                    db_deserialize::<TokenMeta>(&db_token_meta)?;
                Ok((token_tx_num, db_token_meta))
            })
            .collect::<Result<Vec<_>>>()
    }

    fn fetch_token_meta(
        &self,
        token_tx_num: TxNum,
    ) -> Result<Option<TokenMeta>> {
        let data = self
            .db
            .get(self.cf_token_meta, tx_num_to_bytes(token_tx_num))?;
        match data {
            Some(data) => Ok(Some(db_deserialize::<TokenMeta>(&data)?)),
            None => Ok(None),
        }
    }

    fn fetch_genesis_info(
        &self,
        token_tx_num: TxNum,
    ) -> Result<Option<GenesisInfo>> {
        let data = self
            .db
            .get(self.cf_genesis_info, tx_num_to_bytes(token_tx_num))?;
        match data {
            Some(data) => Ok(Some(db_deserialize::<GenesisInfo>(&data)?)),
            None => Ok(None),
        }
    }

    fn fetch_token_tx(&self, tx_num: TxNum) -> Result<Option<DbTokenTx>> {
        match self.db.get(self.cf_token_tx, tx_num_to_bytes(tx_num))? {
            Some(data) => Ok(Some(db_deserialize::<DbTokenTx>(&data)?)),
            None => Ok(None),
        }
    }
}

impl<'a> TokenWriter<'a> {
    /// Create a new [`TokenWriter`].
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(TokenWriter {
            col: TokenCol::new(db)?,
        })
    }

    /// Parse, color & validate the txs as token txs and add them to the index.
    /// Returns the processed result so we can use it in subsequent indices.
    pub fn insert(
        &self,
        batch: &mut WriteBatch,
        txs: &[IndexTx<'_>],
    ) -> Result<ProcessedTokenTxBatch> {
        let batch_processor = BatchProcessor::prepare(txs);
        if !self.col.has_any_tokens()? && !batch_processor.has_any_genesis {
            // Short circuit: No tokens in the DB and no GENESIS in the batch
            return Ok(ProcessedTokenTxBatch::default());
        }

        // Collect all input tx num into a sorted set (RocksDB likes sorted).
        // There may be duplicates, so here we avoid querying the DB twice.
        let all_input_tx_nums = txs
            .iter()
            .flat_map(|tx| tx.input_nums.iter().copied())
            .collect::<BTreeSet<_>>();
        // Collect all input token txs.
        // Note that we query this for *all* txs, even those that don't look
        // like token txs, so we can account for burns.
        let input_token_txs = self
            .col
            .fetch_token_txs(&all_input_tx_nums)?
            .into_iter()
            .collect::<BTreeMap<_, _>>();

        // Collect all token metas used by the inputs
        let mut all_token_tx_nums = input_token_txs
            .values()
            .flat_map(|tx| tx.token_tx_nums.iter().copied())
            .collect::<BTreeSet<_>>();

        // Collect GENESIS info for SLP V2 Mint Vault txs.
        let tx_reader = TxReader::new(self.col.db)?;
        let mint_vault_metas = batch_processor.collect_mint_vault_metas();
        let mut genesis_infos = HashMap::new();
        for meta in &mint_vault_metas {
            if let Some(tx_num) =
                tx_reader.tx_num_by_txid(meta.token_id.txid())?
            {
                if let Some(info) = self.col.fetch_genesis_info(tx_num)? {
                    genesis_infos.insert(*meta, info);
                }
                // Also add their token_tx_nums to all_token_tx_nums to ensure
                // their metas are loaded.
                all_token_tx_nums.insert(tx_num);
            }
        }

        // Fetch token metas by tx_nums
        let token_metas = self
            .col
            .fetch_token_metas(&all_token_tx_nums)?
            .into_iter()
            .collect::<BiMap<_, _>>();

        // Verify tx batch
        let batch_db_data = BatchDbData {
            token_txs: input_token_txs,
            token_metas,
            genesis_infos,
        };
        let processed_batch = batch_processor.verify(batch_db_data)?;

        // Insert token txs to DB
        for (&tx_num, db_token_tx) in &processed_batch.db_token_txs {
            batch.put_cf(
                self.col.cf_token_tx,
                tx_num_to_bytes(tx_num),
                db_serialize::<DbTokenTx>(db_token_tx)?,
            );
        }
        // Insert new tokens created in this batch to the DB
        for (tx_num, token_meta, genesis_info) in &processed_batch.new_tokens {
            batch.put_cf(
                self.col.cf_token_meta,
                tx_num_to_bytes(*tx_num),
                db_serialize::<TokenMeta>(token_meta)?,
            );
            batch.put_cf(
                self.col.cf_genesis_info,
                tx_num_to_bytes(*tx_num),
                db_serialize::<GenesisInfo>(genesis_info)?,
            );
        }

        Ok(processed_batch)
    }

    /// Delete the batch of txs from the token index
    pub fn delete(
        &self,
        batch: &mut WriteBatch,
        txs: &[IndexTx<'_>],
    ) -> Result<()> {
        for tx in txs {
            batch.delete_cf(self.col.cf_token_tx, tx_num_to_bytes(tx.tx_num));
            batch.delete_cf(self.col.cf_token_meta, tx_num_to_bytes(tx.tx_num));
            batch.delete_cf(
                self.col.cf_genesis_info,
                tx_num_to_bytes(tx.tx_num),
            );
        }
        Ok(())
    }

    /// Clear all token data from the DB
    pub fn wipe(&self, batch: &mut WriteBatch) {
        batch.delete_range_cf(
            self.col.cf_genesis_info,
            [].as_ref(),
            &[0xff; 16],
        );
        batch.delete_range_cf(self.col.cf_token_meta, [].as_ref(), &[0xff; 16]);
        batch.delete_range_cf(self.col.cf_token_tx, [].as_ref(), &[0xff; 16]);
    }

    /// In version 11, some token inputs were incorrectly indexed, we can fix
    /// this automatically.
    pub fn upgrade_11_to_12(
        &self,
        load_tx: impl Fn(u32, u32, u32) -> Result<Tx>,
    ) -> Result<()> {
        log!("Upgrading Chronik token index\n");
        let block_reader = BlockReader::new(self.col.db)?;
        let tx_reader = TxReader::new(self.col.db)?;
        let estimated_num_keys = self
            .col
            .db
            .estimate_num_keys(self.col.cf_token_tx)?
            .unwrap_or(0);
        let mut batch = WriteBatch::default();
        for (db_idx, ser_token_tx) in
            self.col.db.full_iterator(self.col.cf_token_tx).enumerate()
        {
            if db_idx % 10000 == 0 {
                log!(
                    "Scanned {db_idx}/{estimated_num_keys} (estimated) token \
                     txs\n"
                );
            }

            let (key, ser_token_tx) = ser_token_tx?;
            let db_token_tx = db_deserialize::<DbTokenTx>(&ser_token_tx)?;
            if db_token_tx
                .outputs
                .iter()
                .any(|&output| output != DbToken::NoToken)
            {
                // Skip txs that have any token outputs
                continue;
            }

            // If a token tx only has NoToken outputs, it may have the wrong
            // input tokens, so we need to reload them
            let tx_num = bytes_to_tx_num(&key)?;
            let block_tx = tx_reader
                .tx_by_tx_num(tx_num)?
                .ok_or(TokenTxNumNotFound(tx_num))?;
            let block = block_reader
                .by_height(block_tx.block_height)?
                .ok_or(BlockNotFound(block_tx.block_height))?;
            let tx = load_tx(
                block.file_num,
                block_tx.entry.data_pos,
                block_tx.entry.undo_pos,
            )?;
            // load input tx_nums
            let input_tx_nums = tx_reader
                .tx_nums_by_txids(
                    tx.inputs.iter().map(|input| &input.prev_out.txid),
                )?
                .into_iter()
                .enumerate()
                .map(|(idx, tx_num)| {
                    tx_num.ok_or(TxNotFound(tx.inputs[idx].prev_out.txid))
                })
                .collect::<Result<Vec<_>, _>>()?;
            let mut has_any_incorrect = false;
            let mut new_db_input_tokens =
                Vec::with_capacity(input_tx_nums.len());
            for (input_idx, (&input_tx_num, tx_input)) in
                input_tx_nums.iter().zip(&tx.inputs).enumerate()
            {
                let prev_out = tx_input.prev_out;

                // Load original input token, or NoToken
                let original_input_token = db_token_tx
                    .inputs
                    .get(input_idx)
                    .copied()
                    .unwrap_or(DbToken::NoToken);

                // Load actual input token and which token tx_num it has
                let (actual_input_token, token_tx_num) = match self
                    .col
                    .fetch_token_tx(input_tx_num)?
                {
                    Some(input_db_token_tx) => {
                        let db_token = *input_db_token_tx
                            .outputs
                            .get(prev_out.out_idx as usize)
                            .ok_or(TokenOutputDoesntExist(prev_out))?;
                        (db_token, input_db_token_tx.token_tx_num(&db_token))
                    }
                    None => (DbToken::NoToken, None),
                };

                // Create new DbToken based on actual_input_token, but must
                // update the token_idx to be based on the *spending* tx.
                let mut new_db_token = actual_input_token;
                if let Some(token_tx_num) = token_tx_num {
                    let token_idx = db_token_tx
                        .token_tx_nums
                        .iter()
                        .position(|&num| num == token_tx_num)
                        .ok_or(TokenTxNumNotFound(token_tx_num))?;
                    new_db_token = new_db_token.with_idx(token_idx as u32);
                }

                // Update whether this tx has any incorrect inputs
                has_any_incorrect =
                    has_any_incorrect || (original_input_token != new_db_token);

                new_db_input_tokens.push(new_db_token);
            }

            if !has_any_incorrect {
                // Avoid writing no-ops to the DB
                continue;
            }

            log_chronik!("Fix incorrectly indexed token tx {}\n", tx.txid());

            let mut db_token_tx = db_token_tx;
            db_token_tx.inputs = new_db_input_tokens;
            batch.put_cf(
                self.col.cf_token_tx,
                tx_num_to_bytes(tx_num),
                db_serialize::<DbTokenTx>(&db_token_tx)?,
            );
        }
        self.col.db.write_batch(batch)?;
        log!("Finished upgrading Chronik token index\n");
        Ok(())
    }

    /// Add the column families used for SLPv2.
    pub(crate) fn add_cfs(columns: &mut Vec<rocksdb::ColumnFamilyDescriptor>) {
        columns.push(rocksdb::ColumnFamilyDescriptor::new(
            CF_TOKEN_GENESIS_INFO,
            rocksdb::Options::default(),
        ));
        columns.push(rocksdb::ColumnFamilyDescriptor::new(
            CF_TOKEN_META,
            rocksdb::Options::default(),
        ));
        columns.push(rocksdb::ColumnFamilyDescriptor::new(
            CF_TOKEN_TX,
            rocksdb::Options::default(),
        ));
    }
}

impl<'a> TokenReader<'a> {
    /// Create a new [`TokenReader`].
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(TokenReader {
            col: TokenCol::new(db)?,
        })
    }

    /// Look up a [`TokenMeta`] by [`TxNum`].
    pub fn token_meta(&self, token_tx_num: TxNum) -> Result<Option<TokenMeta>> {
        self.col.fetch_token_meta(token_tx_num)
    }

    /// Batch-lookup a set of [`TokenMeta`]s by [`TxNum`].
    pub fn token_metas(
        &self,
        token_tx_nums: &BTreeSet<TxNum>,
    ) -> Result<Vec<(TxNum, TokenMeta)>> {
        self.col.fetch_token_metas(token_tx_nums)
    }

    /// Look up a the DB data of a token tx by [`TxNum`].
    pub fn token_tx(&self, tx_num: TxNum) -> Result<Option<DbTokenTx>> {
        self.col.fetch_token_tx(tx_num)
    }

    /// Batch-lookup a set of [`DbTokenTx`]s by [`TxNum`].
    pub fn token_txs(
        &self,
        tx_nums: &BTreeSet<TxNum>,
    ) -> Result<Vec<(TxNum, DbTokenTx)>> {
        self.col.fetch_token_txs(tx_nums)
    }

    /// Look up the DB genesis data of a GENESIS token tx by [`TxNum`].
    pub fn genesis_info(&self, tx_num: TxNum) -> Result<Option<GenesisInfo>> {
        self.col.fetch_genesis_info(tx_num)
    }

    /// Look up the DbTokenTx by [`TxNum`] and the TokenMetas referenced by it.
    pub fn spent_tokens_and_db_tx(
        &self,
        tx_num: TxNum,
    ) -> Result<Option<(Vec<Option<SpentToken>>, DbTokenTx)>> {
        let Some(db_token_tx) = self.token_tx(tx_num)? else {
            return Ok(None);
        };
        let token_tx_nums = db_token_tx
            .token_tx_nums
            .iter()
            .copied()
            .collect::<BTreeSet<_>>();
        let token_metas = self
            .col
            .fetch_token_metas(&token_tx_nums)?
            .into_iter()
            .collect::<BTreeMap<_, _>>();
        let mut spent_inputs = Vec::with_capacity(db_token_tx.inputs.len());
        for input in &db_token_tx.inputs {
            spent_inputs.push(db_token_tx.spent_token(input, |tx_num| {
                token_metas
                    .get(&tx_num)
                    .cloned()
                    .ok_or(TokenTxNumNotFound(tx_num))
            })?);
        }
        Ok(Some((spent_inputs, db_token_tx)))
    }
}

impl std::fmt::Debug for TokenCol<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("TokenCol")
            .field("db", &self.db)
            .field("cf_genesis_info", &"..")
            .field("cf_token_meta", &"..")
            .field("cf_token_tx", &"..")
            .finish()
    }
}
