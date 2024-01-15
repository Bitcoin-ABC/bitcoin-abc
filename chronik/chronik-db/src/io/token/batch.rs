// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{BTreeMap, HashMap, HashSet};

use abc_rust_error::Result;
use bimap::BiMap;
use bitcoinsuite_core::{script::Script, tx::OutPoint};
use bitcoinsuite_slp::{
    color::ColoredTx,
    structs::{GenesisInfo, Token, TokenMeta, TokenVariant, TxType},
    token_tx::TokenTx,
    token_type::TokenType,
    verify::{SpentToken, VerifyContext},
};
use itertools::{Either, Itertools};
use thiserror::Error;
use topo_sort::TopoSort;

use crate::{
    index_tx::IndexTx,
    io::{
        token::{BatchError::*, DbToken, DbTokenTx, FLAGS_HAS_MINT_VAULT},
        TxNum,
    },
};

/// Tx that has token data encoded in it and is ready for token validation
#[derive(Debug)]
pub struct PreparedTx<'tx> {
    /// Tx with index data (tx_num etc.)
    pub tx: &'tx IndexTx<'tx>,
    /// Parsed & colored tx. Note that in this context we only store txs with a
    /// non-empty list of sections.
    pub colored: ColoredTx,
}

/// Struct bundling all the data necessary to process a batch (i.e. a block) of
/// token txs.
#[derive(Debug)]
pub struct BatchProcessor<'tx> {
    /// Tx that have any token info attached
    pub prepared_txs: HashMap<TxNum, PreparedTx<'tx>>,
    /// Non-token txs may still have token inputs
    pub non_token_txs: Vec<&'tx IndexTx<'tx>>,
    /// Whether the batch has any GENESIS txs; if the token index is empty and
    /// we have no GENESIS, we can safely ignore the batch.
    pub has_any_genesis: bool,
}

/// DB data required to process a batch of txs
#[derive(Debug)]
pub struct BatchDbData {
    /// Token tx data coming from the DB
    pub token_txs: BTreeMap<TxNum, DbTokenTx>,
    /// token_nums assigned for each [`TokenMeta`]. This is a bi-map so we can
    /// lookup either direction.
    pub token_metas: BiMap<TxNum, TokenMeta>,
    /// [`GenesisInfo`] from the database; required for SLP V2 Mint Vault txs
    pub genesis_infos: HashMap<TokenMeta, GenesisInfo>,
}

#[derive(Debug, Default)]
/// Result of the batch verification before inserting
pub struct ProcessedTokenTxBatch {
    /// New tokens to be added to the DB
    pub new_tokens: Vec<(TxNum, TokenMeta, GenesisInfo)>,
    /// New DB data for txs to be added to the DB.
    pub db_token_txs: HashMap<TxNum, DbTokenTx>,
    /// Validated token txs in the batch.
    pub valid_txs: HashMap<TxNum, TokenTx>,
    /// True if validation of txs was performed, or false if validation was
    /// safely skipped because no tokens are in the DB and the batch contained
    /// no token txs.
    pub did_validation: bool,
}

/// Error when batch-processing txs, usually implies a critical failure
#[derive(Debug, Error, PartialEq)]
pub enum BatchError {
    /// Transactions couldn't be ordered topologically because of a cycle
    /// dependency. Note: This is cryptographically impossible in practice,
    /// because of the irreversability of SHA256.
    #[error("Cycle in SLP txs")]
    Cycle,

    /// A token_num that should be in the DB was not found
    #[error("Inconsistent BatchDbData: Missing TokenId for token tx num {0}")]
    MissingTokenTxNum(TxNum),

    /// GenesisInfo that should be in the DB was not found
    #[error("Inconsistent Tx: Missing coin for TxInput {0:?}")]
    MissingTxInputCoin(OutPoint),
}

impl<'tx> BatchProcessor<'tx> {
    /// Prepare the given indexed txs as token txs.
    pub fn prepare(txs: &'tx [IndexTx<'tx>]) -> Self {
        let (prepared_txs, non_token_txs): (HashMap<_, _>, Vec<_>) = txs
            .iter()
            .partition_map(|tx| match ColoredTx::color_tx(tx.tx) {
                Some(colored) if !colored.sections.is_empty() => {
                    Either::Left((tx.tx_num, PreparedTx { tx, colored }))
                }
                _ => Either::Right(tx),
            });

        // Coloring step ensures all GENESIS are at the first section
        let has_any_genesis = prepared_txs
            .values()
            .any(|tx| tx.colored.sections[0].tx_type == TxType::GENESIS);

        BatchProcessor {
            prepared_txs,
            non_token_txs,
            has_any_genesis,
        }
    }

    /// Collect all [`TokenMeta`]s of the SLP V2 Mint Vault txs in the batch
    pub fn collect_mint_vault_metas(&self) -> HashSet<TokenMeta> {
        self.prepared_txs
            .values()
            .filter(|tx| tx.colored.sections[0].is_mint_vault_mint())
            .map(|tx| tx.colored.sections[0].meta)
            .collect()
    }

    /// Verify the entire batch of txs. It updates the DB data with some token
    /// data during validation, but that can be discarded. The result of the
    /// verification is returned as [`ProcessedTokenTxBatch`].
    pub fn verify(
        mut self,
        mut db_data: BatchDbData,
    ) -> Result<ProcessedTokenTxBatch> {
        // Build a DAG of tx nums so we can sort topologically
        let mut topo_sort = TopoSort::with_capacity(self.prepared_txs.len());
        for (&tx_num, batch_tx) in &self.prepared_txs {
            topo_sort.insert_from_slice(tx_num, &batch_tx.tx.input_nums);
        }

        // Iterate txs in topological order
        let mut processed_batch = ProcessedTokenTxBatch {
            did_validation: true,
            ..Default::default()
        };
        for tx_num in topo_sort.into_nodes() {
            let tx_num = tx_num.map_err(|_| Cycle)?;
            let prepared_tx = self.prepared_txs.remove(&tx_num).unwrap();
            self.verify_token_tx(
                prepared_tx,
                &mut db_data,
                &mut processed_batch,
            )?;
        }

        // Non-token txs can still contain token inputs, add those to the index
        // too
        for non_token_tx in &self.non_token_txs {
            self.process_non_token_tx(
                non_token_tx,
                &mut db_data,
                &mut processed_batch,
            );
        }

        Ok(processed_batch)
    }

    fn verify_token_tx(
        &self,
        prepared_tx: PreparedTx<'_>,
        db_data: &mut BatchDbData,
        processed_batch: &mut ProcessedTokenTxBatch,
    ) -> Result<()> {
        let tx_num = prepared_tx.tx.tx_num;
        let spent_tokens = self.tx_token_inputs(
            prepared_tx.tx,
            db_data,
            &processed_batch.valid_txs,
        )?;

        let first_section = &prepared_tx.colored.sections[0];
        let is_genesis = first_section.genesis_info.is_some();
        let is_mint_vault_mint = first_section.is_mint_vault_mint();

        // MINT txs on SLP V2 tokens need spent scripts and genesis data
        let mut spent_scripts = None;
        let mut genesis_info = None;
        if is_mint_vault_mint {
            spent_scripts = Some(Self::tx_spent_scripts(prepared_tx.tx)?);
            genesis_info = db_data.genesis_infos.get(&first_section.meta);
        }

        let context = VerifyContext {
            spent_tokens: &spent_tokens,
            spent_scripts: spent_scripts.as_deref(),
            genesis_info,
            override_has_mint_vault: None,
        };
        let valid_tx = context.verify(prepared_tx.colored);

        let has_any_inputs = spent_tokens.iter().any(|input| input.is_some());
        let has_any_outputs =
            valid_tx.outputs.iter().any(|token| token.is_some());
        // Don't store txs that have no actual token inputs or outputs
        if !has_any_outputs && !has_any_inputs && !is_genesis {
            return Ok(());
        }

        // Add new tokens from GENESIS txs
        if let Some(entry) = valid_tx.entries.get(0) {
            // Skip invalid GENESIS txs
            if !entry.is_invalid {
                if let Some(info) = &entry.genesis_info {
                    db_data.token_metas.insert(tx_num, entry.meta);
                    processed_batch.new_tokens.push((
                        tx_num,
                        entry.meta,
                        info.clone(),
                    ));
                    // Note: Don't update db_data.genesis_info, because SLP V2
                    // GENESIS txs require a confirmation before they take
                    // effect.
                }
            }
        }

        let mut token_tx_nums = Vec::new();
        let mut token_metas = Vec::new();
        let mut group_token_metas = BTreeMap::new();
        for entry in &valid_tx.entries {
            let Some(&token_tx_num) =
                db_data.token_metas.get_by_right(&entry.meta)
            else {
                continue;
            };
            if !token_metas.iter().contains(&entry.meta) {
                token_tx_nums.push(token_tx_num);
                token_metas.push(entry.meta);
            }
            entry.group_token_meta.and_then(|group_meta| {
                let &tx_num = db_data.token_metas.get_by_right(&group_meta)?;
                if !token_metas.iter().contains(&group_meta) {
                    token_tx_nums.push(tx_num);
                    token_metas.push(group_meta);
                    group_token_metas.insert(entry.meta, group_meta);
                }
                Some(())
            });
        }

        let mut flags = 0;
        if is_mint_vault_mint {
            let first_entry = valid_tx.entries.get(0);
            let has_mint_vault =
                first_entry.map_or(false, |entry| !entry.is_invalid);
            if has_mint_vault {
                flags |= FLAGS_HAS_MINT_VAULT;
            }
        }

        let db_token_tx = DbTokenTx {
            token_tx_nums,
            group_token_indices: group_token_metas
                .iter()
                .map(|(meta, group_meta)| {
                    (
                        meta_idx(meta, &token_metas),
                        meta_idx(group_meta, &token_metas),
                    )
                })
                .collect(),
            inputs: spent_tokens
                .iter()
                .map(|input| {
                    to_db_token(
                        input.as_ref().map(|input| &input.token),
                        &token_metas,
                    )
                })
                .collect::<Vec<_>>(),
            outputs: valid_tx
                .outputs
                .iter()
                .map(|output| {
                    to_db_token(
                        output
                            .as_ref()
                            .map(|output| valid_tx.token(output))
                            .as_ref(),
                        &token_metas,
                    )
                })
                .collect::<Vec<_>>(),
            flags,
        };
        processed_batch.db_token_txs.insert(tx_num, db_token_tx);
        processed_batch.valid_txs.insert(tx_num, valid_tx);

        Ok(())
    }

    fn process_non_token_tx(
        &self,
        tx: &IndexTx<'_>,
        db_data: &mut BatchDbData,
        processed_batch: &mut ProcessedTokenTxBatch,
    ) {
        let mut db_token_tx_nums = Vec::new();
        let mut db_inputs = Vec::with_capacity(tx.input_nums.len());
        let mut db_group_token_indices = BTreeMap::new();
        for (&input_tx_num, input) in tx.input_nums.iter().zip(&tx.tx.inputs) {
            let out_idx = input.prev_out.out_idx as usize;
            let db_token_tx = processed_batch
                .db_token_txs
                .get(&input_tx_num)
                .or_else(|| db_data.token_txs.get(&input_tx_num));
            let Some(db_token_tx) = db_token_tx else {
                continue;
            };
            let db_token = &db_token_tx.outputs[out_idx];
            let Some(token_tx_num) = db_token_tx.token_tx_num(db_token) else {
                db_inputs.push(*db_token);
                continue;
            };
            let token_num_idx = db_token_tx_nums
                .iter()
                .position(|&tx_num| tx_num == token_tx_num)
                .unwrap_or_else(|| {
                    db_token_tx_nums.push(token_tx_num);
                    db_token_tx_nums.len() - 1
                });
            if let Some(group_token_tx_num) =
                db_token_tx.group_token_tx_num(db_token)
            {
                let group_token_num_idx = db_token_tx_nums
                    .iter()
                    .position(|&tx_num| tx_num == group_token_tx_num)
                    .unwrap_or_else(|| {
                        db_token_tx_nums.push(group_token_tx_num);
                        db_token_tx_nums.len() - 1
                    });
                db_group_token_indices
                    .insert(token_num_idx as u32, group_token_num_idx as u32);
            }
            db_inputs.push(db_token.with_idx(token_num_idx as u32));
        }

        // Skip non-token tx if we don't have any token inputs
        if db_inputs.iter().any(|&input| input != DbToken::NoToken) {
            processed_batch.db_token_txs.insert(
                tx.tx_num,
                DbTokenTx {
                    token_tx_nums: db_token_tx_nums,
                    group_token_indices: db_group_token_indices,
                    inputs: db_inputs,
                    outputs: vec![DbToken::NoToken; tx.tx.outputs.len()],
                    flags: 0,
                },
            );
        }
    }

    fn tx_spent_scripts(tx: &IndexTx<'_>) -> Result<Vec<Script>> {
        let mut spent_scripts = Vec::with_capacity(tx.tx.inputs.len());
        for tx_input in &tx.tx.inputs {
            let coin = tx_input
                .coin
                .as_ref()
                .ok_or(MissingTxInputCoin(tx_input.prev_out))?;
            spent_scripts.push(coin.output.script.clone());
        }
        Ok(spent_scripts)
    }

    fn tx_token_inputs(
        &self,
        tx: &IndexTx<'_>,
        db_data: &BatchDbData,
        valid_txs: &HashMap<TxNum, TokenTx>,
    ) -> Result<Vec<Option<SpentToken>>> {
        if tx.is_coinbase {
            Ok(vec![])
        } else {
            let mut inputs = Vec::with_capacity(tx.input_nums.len());
            for (&input_num, input) in tx.input_nums.iter().zip(&tx.tx.inputs) {
                inputs.push(self.token_output(
                    input_num,
                    input.prev_out.out_idx as usize,
                    db_data,
                    valid_txs,
                )?);
            }
            Ok(inputs)
        }
    }

    fn token_output(
        &self,
        tx_num: TxNum,
        out_idx: usize,
        db_data: &BatchDbData,
        valid_txs: &HashMap<TxNum, TokenTx>,
    ) -> Result<Option<SpentToken>> {
        // Output is from this batch
        if let Some(token_tx) = valid_txs.get(&tx_num) {
            let Some(Some(token_output)) = token_tx.outputs.get(out_idx) else {
                return Ok(None);
            };
            return Ok(Some(token_tx.spent_token(token_output)));
        }

        // Output is from the DB
        let Some(db_token_tx) = db_data.token_txs.get(&tx_num) else {
            return Ok(None);
        };
        Ok(db_token_tx.spent_token(
            &db_token_tx.outputs[out_idx],
            |tx_num| {
                db_data
                    .token_metas
                    .get_by_left(&tx_num)
                    .cloned()
                    .ok_or(MissingTokenTxNum(tx_num))
            },
        )?)
    }
}

fn meta_idx(needle_meta: &TokenMeta, metas: &[TokenMeta]) -> u32 {
    metas
        .iter()
        .position(|meta| meta == needle_meta)
        .expect("TokenMeta should be in the list") as u32
}

fn to_db_token(token: Option<&Token>, metas: &[TokenMeta]) -> DbToken {
    let Some(token) = token else {
        return DbToken::NoToken;
    };
    match token.variant {
        TokenVariant::Amount(amount) => {
            DbToken::Amount(meta_idx(&token.meta, metas), amount)
        }
        TokenVariant::MintBaton => {
            DbToken::MintBaton(meta_idx(&token.meta, metas))
        }
        TokenVariant::Unknown(token_type) => match token.meta.token_type {
            TokenType::Slp(_) => DbToken::UnknownSlp(token_type),
            TokenType::Alp(_) => DbToken::UnknownAlp(token_type),
        },
    }
}
