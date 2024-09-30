// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{BTreeMap, BTreeSet, HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{Tx, TxId};
use bitcoinsuite_slp::token_id::TokenId;

use crate::{
    db::{
        Db, CF_TOKEN_ID_HISTORY, CF_TOKEN_ID_HISTORY_NUM_TXS, CF_TOKEN_ID_UTXO,
    },
    group::{Group, GroupQuery, MemberItem, UtxoDataOutput},
    index_tx::IndexTx,
    io::{
        token::{DbToken, ProcessedTokenTxBatch, TokenReader},
        GroupHistoryConf, GroupHistoryReader, GroupHistoryWriter,
        GroupUtxoConf, GroupUtxoReader, GroupUtxoWriter,
    },
    mem::{MempoolGroupHistory, MempoolGroupUtxos, MempoolTokens},
};

/// Index the mempool tx history of token IDs
pub type MempoolTokenIdHistory = MempoolGroupHistory<TokenIdGroup>;
/// Index the mempool UTXOs of token IDs
pub type MempoolTokenIdUtxos = MempoolGroupUtxos<TokenIdGroup>;
/// Index the tx history of script in the DB
pub type TokenIdHistoryWriter<'a> = GroupHistoryWriter<'a, TokenIdGroup>;
/// Read the tx history of token IDs in the DB
pub type TokenIdHistoryReader<'a> = GroupHistoryReader<'a, TokenIdGroup>;
/// Index the UTXOs of token IDs in the DB
pub type TokenIdUtxoWriter<'a> = GroupUtxoWriter<'a, TokenIdGroup>;
/// Read the UTXOs of token IDs in the DB
pub type TokenIdUtxoReader<'a> = GroupUtxoReader<'a, TokenIdGroup>;

/// Group txs by token ID.
#[derive(Clone, Debug)]
pub struct TokenIdGroup;

type MaybeTokenIds = Vec<Option<TokenId>>;

/// Auxillary data for indexing by token ID
#[derive(Debug, Default)]
pub struct TokenIdGroupAux {
    txs: HashMap<TxId, (MaybeTokenIds, MaybeTokenIds)>,
}

impl Group for TokenIdGroup {
    type Aux = TokenIdGroupAux;
    type Iter<'a> = Vec<MemberItem<TokenId>>;
    type Member<'a> = TokenId;
    type MemberSer = [u8; 32];
    type UtxoData = UtxoDataOutput;

    fn input_members<'a>(
        &self,
        query: GroupQuery<'a>,
        aux: &TokenIdGroupAux,
    ) -> Self::Iter<'a> {
        if query.is_coinbase {
            return vec![];
        }
        let Some((input_token_ids, _)) = aux.txs.get(query.tx.txid_ref())
        else {
            return vec![];
        };
        let mut inputs = Vec::with_capacity(query.tx.inputs.len());
        for (idx, token_id) in input_token_ids.iter().enumerate() {
            if let Some(token_id) = token_id {
                inputs.push(MemberItem {
                    idx,
                    member: *token_id,
                });
            }
        }
        inputs
    }

    fn output_members<'a>(
        &self,
        query: GroupQuery<'a>,
        aux: &TokenIdGroupAux,
    ) -> Self::Iter<'a> {
        let Some((_, output_token_ids)) = aux.txs.get(query.tx.txid_ref())
        else {
            return vec![];
        };
        let mut output_scripts = Vec::with_capacity(query.tx.outputs.len());
        for (idx, token_id) in output_token_ids.iter().enumerate() {
            if let Some(token_id) = token_id {
                output_scripts.push(MemberItem {
                    idx,
                    member: *token_id,
                });
            }
        }
        output_scripts
    }

    fn ser_member(&self, member: &Self::Member<'_>) -> Self::MemberSer {
        member.to_be_bytes()
    }

    fn ser_hash_member(&self, _member: &Self::Member<'_>) -> [u8; 32] {
        unimplemented!("There is no use case for hashing TokenIdGroup")
    }

    fn tx_history_conf() -> GroupHistoryConf {
        GroupHistoryConf {
            cf_page_name: CF_TOKEN_ID_HISTORY,
            cf_num_txs_name: CF_TOKEN_ID_HISTORY_NUM_TXS,
            page_size: 1000,
            cf_member_hash_name: None,
        }
    }

    fn utxo_conf() -> GroupUtxoConf {
        GroupUtxoConf {
            cf_name: CF_TOKEN_ID_UTXO,
        }
    }
}

impl TokenIdGroupAux {
    /// Build aux data from a processed token batch
    pub fn from_batch(
        txs: &[IndexTx<'_>],
        batch: &ProcessedTokenTxBatch,
    ) -> Self {
        let mut aux = HashMap::with_capacity(batch.valid_txs.len());
        for tx in txs {
            let Some(spent_tokens) = batch.spent_tokens.get(&tx.tx_num) else {
                continue;
            };
            let token_tx = batch.valid_txs.get(&tx.tx_num);
            aux.insert(
                tx.tx.txid(),
                (
                    spent_tokens
                        .iter()
                        .map(|token| Some(token.as_ref()?.token.meta.token_id))
                        .collect::<Vec<_>>(),
                    token_tx
                        .map(|token_tx| {
                            token_tx
                                .outputs
                                .iter()
                                .map(|output| {
                                    Some(
                                        token_tx
                                            .token(output.as_ref()?)
                                            .meta
                                            .token_id,
                                    )
                                })
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_else(|| vec![None; tx.tx.outputs.len()]),
                ),
            );
        }
        TokenIdGroupAux { txs: aux }
    }

    /// Retrieve the aux data from the DB
    pub fn from_db(txs: &[IndexTx<'_>], db: &Db) -> Result<Self> {
        let token_reader = TokenReader::new(db)?;
        let tx_nums = txs.iter().map(|tx| tx.tx_num).collect::<BTreeSet<_>>();
        let db_token_txs = token_reader
            .token_txs(&tx_nums)?
            .into_iter()
            .collect::<BTreeMap<_, _>>();
        let token_tx_nums = db_token_txs
            .values()
            .flat_map(|token_tx| token_tx.token_tx_nums.iter().cloned())
            .collect::<BTreeSet<_>>();
        let token_metas = token_reader
            .token_metas(&token_tx_nums)?
            .into_iter()
            .collect::<BTreeMap<_, _>>();
        let mut aux = HashMap::with_capacity(db_token_txs.len());
        for tx in txs {
            let Some(db_token_tx) = db_token_txs.get(&tx.tx_num) else {
                continue;
            };
            let db_token_id = |db_token: &DbToken| -> Option<TokenId> {
                let token_tx_num = db_token_tx.token_tx_num(db_token)?;
                Some(token_metas.get(&token_tx_num)?.token_id)
            };
            let input_token_ids = db_token_tx
                .inputs
                .iter()
                .map(db_token_id)
                .collect::<Vec<_>>();
            let output_token_ids = db_token_tx
                .outputs
                .iter()
                .map(db_token_id)
                .collect::<Vec<_>>();
            aux.insert(tx.tx.txid(), (input_token_ids, output_token_ids));
        }
        Ok(TokenIdGroupAux { txs: aux })
    }

    /// Retrieve the aux data from the mempool
    pub fn from_mempool(tx: &Tx, mempool: &MempoolTokens) -> Self {
        let mut aux = HashMap::new();
        let Some(token_tx) = mempool.token_tx(tx.txid_ref()) else {
            return TokenIdGroupAux::default();
        };
        let output_token_ids = token_tx
            .outputs
            .iter()
            .map(|output| Some(token_tx.token(output.as_ref()?).meta.token_id))
            .collect::<Vec<_>>();
        let input_token_ids = match mempool.tx_token_inputs(tx.txid_ref()) {
            Some(spent_tokens) => spent_tokens
                .iter()
                .map(|token| Some(token.as_ref()?.token.meta.token_id))
                .collect::<Vec<_>>(),
            None => vec![None; tx.inputs.len()],
        };
        aux.insert(tx.txid(), (input_token_ids, output_token_ids));
        TokenIdGroupAux { txs: aux }
    }
}
