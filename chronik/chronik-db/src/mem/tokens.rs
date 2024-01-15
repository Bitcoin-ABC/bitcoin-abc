// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`MempoolTokens`].

use std::collections::{BTreeMap, BTreeSet, HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, Tx, TxId};
use bitcoinsuite_slp::{
    color::ColoredTx,
    structs::GenesisInfo,
    token_tx::TokenTx,
    verify::{SpentToken, VerifyContext},
};
use thiserror::Error;

use crate::{
    db::Db,
    io::{token::TokenReader, TxReader},
    mem::{MempoolTokensError::*, MempoolTx},
};

/// Token data of the mempool
#[derive(Debug, Default)]
pub struct MempoolTokens {
    token_txs: HashMap<TxId, TokenTx>,
    tx_token_inputs: HashMap<TxId, Vec<Option<SpentToken>>>,
}

/// Error indicating something went wrong with [`MempoolTokens`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum MempoolTokensError {
    /// Mempool tx spends outputs of non-existent tx
    #[error(
        "Failed indexing mempool token tx: Tx is spending {0} which is found \
         neither in the mempool nor DB"
    )]
    InputTxNotFound(TxId),

    /// Mempool tx spends non-existent output of existing tx
    #[error(
        "Failed indexing mempool token tx: Tx spends non-existent token \
         output {0:?}"
    )]
    InputTxNoSuchOutput(OutPoint),
}

impl MempoolTokens {
    /// Parse, color and verify a potential token tx.
    pub fn insert(
        &mut self,
        db: &Db,
        tx: &MempoolTx,
        is_mempool_tx: impl Fn(&TxId) -> bool,
    ) -> Result<()> {
        let spent_tokens =
            self.fetch_tx_spent_tokens(&tx.tx, db, &is_mempool_tx)??;
        let has_any_tokens = spent_tokens.iter().any(|token| token.is_some());

        let colored = ColoredTx::color_tx(&tx.tx);
        if colored.is_none() && !has_any_tokens {
            return Ok(());
        }
        let colored = colored.unwrap_or_else(|| ColoredTx {
            outputs: vec![None; tx.tx.outputs.len()],
            ..Default::default()
        });

        // MINT txs on SLP V2 tokens need the output script and genesis data.
        //
        // IMPORTANT: Because SLP V2 GENESIS and MINT tx don't have to be
        // dependent on each other, they can be confirmed independently from
        // each other. This creates scenarios where our implementation reports a
        // MINT tx as "valid"/"invalid" when it strictly following the spec
        // shouldn't.
        //
        // ## Scenario 1:
        // 1. A SLP V2 MINT VAULT GENESIS has been mined
        // 2. A MINT tx of that token ID is added to the mempool and (correctly)
        //    considered "valid"
        // 3. The GENESIS tx is then reorged and added back to the mempool
        // 4. => Since we don't scan the mempool for this case, the MINT tx will
        //    still be considered "valid", even though now the GENESIS is no
        //    longer confirmed and should be considered "invalid"
        // 5. Both GENESIS and MINT are mined in a block
        // 6. => MINT will now be considered "invalid" (since it’s in the same
        //    block as the GENESIS).
        //
        // ## Scenario 2:
        // 1. A SLP V2 MINT VAULT GENESIS and a MINT of that type is in the
        //    mempool
        // 2. => The MINT will be considered "invalid" (because the GENESIS is
        //    not confirmed).
        // 3. Only the GENESIS tx is confirmed in a block
        // 4. => The MINT tx in the mempool will still continue to stay
        //    "invalid", even though the GENESIS has been confirmed
        // 5. The MINT is now also confirmed in another block
        // 6. => Now the MINT is considered "valid", since validation is ran
        //    again and the GENESIS is in a previous block
        //
        // However, because of the following reasons we choose to allow these
        // inconsistencies:
        // - These scenarios are rare
        // - Ensuring strict consistency would require a lot of complexity
        // - SLP V2 GENESIS txs are relatively niche
        // - These inconsistencies will be resolved automatically when the txs
        //   are mined anyway
        let mut spent_scripts = None;
        let mut genesis_info = None;
        if let Some(first_section) = colored.sections.first() {
            if first_section.is_mint_vault_mint() {
                spent_scripts = Some(
                    tx.tx
                        .inputs
                        .iter()
                        .map(|input| {
                            input
                                .coin
                                .as_ref()
                                .map(|coin| coin.output.script.clone())
                                .unwrap_or_default()
                        })
                        .collect::<Vec<_>>(),
                );
                let tx_reader = TxReader::new(db)?;
                let token_reader = TokenReader::new(db)?;
                let tx_num = tx_reader
                    .tx_num_by_txid(first_section.meta.token_id.txid())?;
                if let Some(tx_num) = tx_num {
                    if let Some(db_genesis_info) =
                        token_reader.genesis_info(tx_num)?
                    {
                        genesis_info = Some(db_genesis_info);
                    }
                }
            }
        }

        let context = VerifyContext {
            genesis_info: genesis_info.as_ref(),
            spent_tokens: &spent_tokens,
            spent_scripts: spent_scripts.as_deref(),
            override_has_mint_vault: None,
        };
        let verified = context.verify(colored);
        self.token_txs.insert(tx.tx.txid(), verified);
        if has_any_tokens {
            self.tx_token_inputs.insert(tx.tx.txid(), spent_tokens);
        }
        Ok(())
    }

    /// Remove a token tx from the mempool by [`TxId`].
    pub fn remove(&mut self, txid: &TxId) {
        self.token_txs.remove(txid);
        self.tx_token_inputs.remove(txid);
    }

    /// Fetch the spent tokens of the given tx.
    ///
    /// This fetches from the tx in bulk wherever possible:
    /// 1. Find all the TxNums of the inputs not in the mempool
    /// 2. Batch-lookup the DbTokenTxs
    /// 3. Collect all token_tx_nums actually used by the inputs
    /// 4. Batch-lookup the TokenMetas used by the inputs
    /// 5. Assemble the SpentTokens
    ///
    /// To distinguish between invalid txs (e.g. coming from the user) and
    /// database corruption, we return a `Result<Result<_>>`:
    /// - `Ok(Ok(_))` means all inputs could successfully be found.
    /// - `Ok(Err(_))` means some inputs failed to be found.
    /// - `Err(_)` means some unexpected database error.
    pub fn fetch_tx_spent_tokens(
        &self,
        tx: &Tx,
        db: &Db,
        is_mempool_tx: impl Fn(&TxId) -> bool,
    ) -> Result<Result<Vec<Option<SpentToken>>, MempoolTokensError>> {
        let tx_reader = TxReader::new(db)?;
        let token_reader = TokenReader::new(db)?;

        // The spent tokens we've found, all default to None
        let mut spent_tokens = vec![None; tx.inputs.len()];
        // TxNums for which we'll look up token data in the DB
        let mut input_tx_nums = vec![None; tx.inputs.len()];
        for (input_idx, input) in tx.inputs.iter().enumerate() {
            let input_txid = &input.prev_out.txid;
            let out_idx = input.prev_out.out_idx as usize;

            // If we find the prevout in the mempool, set the SpentToken
            if let Some(token_tx) = self.token_txs.get(input_txid) {
                match token_tx.outputs.get(out_idx) {
                    Some(output) => {
                        spent_tokens[input_idx] = output
                            .as_ref()
                            .map(|output| token_tx.spent_token(output))
                    }
                    None => {
                        return Ok(Err(InputTxNoSuchOutput(input.prev_out)))
                    }
                }
                continue;
            }

            // prevout is in the mempool but not a token tx
            if is_mempool_tx(input_txid) {
                continue;
            }

            // Otherwise, tx should be in the DB, query just its TxNum and store
            // it in input_tx_nums, so we know which ones to fill in later.
            match tx_reader.tx_num_by_txid(input_txid)? {
                Some(tx_num) => input_tx_nums[input_idx] = Some(tx_num),
                None => return Ok(Err(InputTxNotFound(*input_txid))),
            }
        }

        // Batch-query the token data for DB inputs; only once per TxNum
        let token_txs = token_reader
            .token_txs(&input_tx_nums.iter().flatten().copied().collect())?;
        let token_txs = token_txs.into_iter().collect::<BTreeMap<_, _>>();

        // Collect all the token_tx_nums actually used in the inputs...
        let mut token_tx_nums = BTreeSet::new();
        for (input_idx, input) in tx.inputs.iter().enumerate() {
            let out_idx = input.prev_out.out_idx as usize;
            let Some(input_tx_num) = input_tx_nums[input_idx] else {
                // We already found the input in the mempool previously
                continue;
            };
            let Some(token_tx) = token_txs.get(&input_tx_num) else {
                // Input tx not a token tx
                continue;
            };
            if token_tx.outputs.len() < out_idx {
                return Ok(Err(InputTxNoSuchOutput(input.prev_out)));
            }
            let Some(token_num_idx) = token_tx.outputs[out_idx].token_num_idx()
            else {
                // Ignore non-token or unknown outputs
                continue;
            };
            token_tx_nums
                .insert(token_tx.token_tx_nums[token_num_idx as usize]);
            if let Some(&group_idx) =
                token_tx.group_token_indices.get(&token_num_idx)
            {
                token_tx_nums
                    .insert(token_tx.token_tx_nums[group_idx as usize]);
            }
        }

        // ...and batch-lookup their TokenMetas
        let token_metas = token_reader
            .token_metas(&token_tx_nums)?
            .into_iter()
            .collect::<BTreeMap<_, _>>();

        // Now, we can fill in the found SpentTokens from the DB
        for (input_idx, input) in tx.inputs.iter().enumerate() {
            let out_idx = input.prev_out.out_idx as usize;
            let Some(input_tx_num) = input_tx_nums[input_idx] else {
                continue;
            };
            let Some(token_tx) = token_txs.get(&input_tx_num) else {
                continue;
            };
            // This will always succeed as `.token_metas()` returns an error on
            // missing TokenMetas already.
            spent_tokens[input_idx] = token_tx.spent_token(
                &token_tx.outputs[out_idx],
                |tx_num| -> Result<_> { Ok(token_metas[&tx_num]) },
            )?;
        }

        Ok(Ok(spent_tokens))
    }

    /// Get the [`TokenTx`] attached to a tx in the mempool, if any
    pub fn token_tx(&self, txid: &TxId) -> Option<&TokenTx> {
        self.token_txs.get(txid)
    }

    /// Get the [`SpentToken`] inputs of a tx in the mempool, if any
    pub fn tx_token_inputs(
        &self,
        txid: &TxId,
    ) -> Option<&[Option<SpentToken>]> {
        self.tx_token_inputs
            .get(txid)
            .map(|inputs| inputs.as_slice())
    }

    /// Get the [`SpentToken`] of an outpoint in the mempool, if any
    pub fn spent_token(
        &self,
        outpoint: &OutPoint,
    ) -> Result<Option<SpentToken>, MempoolTokensError> {
        let out_idx = outpoint.out_idx as usize;
        let Some(tx_tokens) = self.token_txs.get(&outpoint.txid) else {
            return Ok(None);
        };
        let token_output = tx_tokens
            .outputs
            .get(out_idx)
            .ok_or(InputTxNoSuchOutput(*outpoint))?
            .as_ref();
        Ok(token_output.map(|output| tx_tokens.spent_token(output)))
    }

    /// Get the [`GenesisInfo`] of a GENESIS tx by [`TxId`], if this is a valid
    /// GENESIS tx.
    pub fn genesis_info(&self, txid: &TxId) -> Option<&GenesisInfo> {
        let tx_tokens = self.token_txs.get(txid)?;
        tx_tokens.entries.first()?.genesis_info.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use std::{cell::RefCell, collections::BTreeMap};

    use abc_rust_error::Result;
    use bitcoinsuite_core::{
        hash::ShaRmd160,
        script::Script,
        tx::{OutPoint, Tx, TxId},
    };
    use bitcoinsuite_slp::{
        slp::{
            burn_opreturn, genesis_opreturn, mint_vault_opreturn, send_opreturn,
        },
        structs::{GenesisInfo, TxType},
        test_helpers::{
            empty_entry, meta_slp, spent_amount, spent_amount_group,
            spent_baton, token_amount, token_baton, TOKEN_ID1, TOKEN_ID3,
            TOKEN_ID4, TOKEN_ID5, TOKEN_ID8,
        },
        token_tx::{TokenTx, TokenTxEntry},
        token_type::SlpTokenType::*,
        verify::BurnError,
    };
    use pretty_assertions::assert_eq;

    use crate::{
        db::CF_TOKEN_META,
        io::{
            token::{
                tests::mock::{make_tx, make_tx_with_scripts, MockTokenDb},
                TokenIndexError,
            },
            tx_num_to_bytes,
        },
        mem::{MempoolTokens, MempoolTokensError, MempoolTx},
    };

    fn txid(txid_num: u8) -> TxId {
        TxId::from([txid_num; 32])
    }

    fn outpoint(txid_num: u8, out_idx: u32) -> OutPoint {
        OutPoint {
            txid: txid(txid_num),
            out_idx,
        }
    }

    #[test]
    fn test_mempool_tokens() -> Result<()> {
        abc_rust_error::install();
        let (db, _tempdir) = MockTokenDb::setup_db()?;
        let mock_db = RefCell::new(MockTokenDb::setup(&db)?);

        let mempool_txs = RefCell::new(BTreeMap::new());
        let mempool_tokens = RefCell::new(MempoolTokens::default());

        let mem_tokens = || mempool_tokens.borrow();
        let is_mempool_tx =
            |txid: &TxId| mempool_txs.borrow().contains_key(txid);

        let add_to_mempool = |tx: Tx| -> Result<()> {
            let mempool_tx = MempoolTx {
                tx,
                time_first_seen: 0,
            };
            mempool_tokens.borrow_mut().insert(
                &db,
                &mempool_tx,
                is_mempool_tx,
            )?;
            mempool_txs
                .borrow_mut()
                .insert(mempool_tx.tx.txid(), mempool_tx.tx);
            Ok(())
        };

        let remove_from_mempool = |txid: &TxId| {
            mempool_tokens.borrow_mut().remove(txid);
            mempool_txs.borrow_mut().remove(txid);
        };

        let generate = || -> Result<()> {
            let mempool_txs = std::mem::take(&mut *mempool_txs.borrow_mut());
            mock_db
                .borrow_mut()
                .connect(&mempool_txs.into_values().collect::<Vec<_>>())?;
            *mempool_tokens.borrow_mut() = MempoolTokens::default();
            Ok(())
        };

        // Tx 0: Adding a non-token tx to the mempool indexes nothing
        add_to_mempool(make_tx(0, [], 1, Script::default()))?;
        assert_eq!(mem_tokens().token_tx(&txid(0)), None);
        assert_eq!(mem_tokens().tx_token_inputs(&txid(0)), None);
        assert_eq!(mem_tokens().spent_token(&outpoint(0, 1))?, None);
        assert_eq!(mem_tokens().spent_token(&outpoint(0, 9999))?, None);

        // Tx 1: Invalid BURN indexed in mempool
        add_to_mempool(make_tx(
            1,
            [],
            1,
            burn_opreturn(&TOKEN_ID1, Fungible, 1000),
        ))?;
        assert_eq!(
            mem_tokens().token_tx(&txid(1)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID1, Fungible),
                    tx_type: Some(TxType::BURN),
                    intentional_burn_amount: Some(1000),
                    ..empty_entry()
                }],
                outputs: vec![None, None],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(mem_tokens().tx_token_inputs(&txid(1)), None);
        assert_eq!(mem_tokens().spent_token(&outpoint(1, 1))?, None);

        // Tx 2: Valid empty SEND indexed in mempool
        add_to_mempool(make_tx(
            2,
            [],
            1,
            send_opreturn(&TOKEN_ID1, Fungible, &[0, 0]),
        ))?;
        assert_eq!(
            mem_tokens().token_tx(&txid(2)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID1, Fungible),
                    tx_type: Some(TxType::SEND),
                    ..empty_entry()
                }],
                outputs: vec![None, None],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(mem_tokens().tx_token_inputs(&txid(2)), None);
        assert_eq!(mem_tokens().spent_token(&outpoint(2, 1))?, None);
        assert_eq!(
            mem_tokens().spent_token(&outpoint(2, 9999)).unwrap_err(),
            MempoolTokensError::InputTxNoSuchOutput(outpoint(2, 9999)),
        );

        // Tx 3: Add SLP Fungible GENESIS
        let genesis_info = GenesisInfo {
            token_ticker: b"SLP FUNGIBLE".as_ref().into(),
            token_name: b"Fungible SLP token".as_ref().into(),
            url: b"https://fungible.slp/".as_ref().into(),
            hash: Some([44; 32]),
            decimals: 4,
            ..Default::default()
        };
        add_to_mempool(make_tx(
            3,
            [],
            2,
            genesis_opreturn(&genesis_info, Fungible, Some(2), 1234),
        ))?;
        assert_eq!(mem_tokens().genesis_info(&txid(3)), Some(&genesis_info));
        assert_eq!(
            mem_tokens().token_tx(&txid(3)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID3, Fungible),
                    tx_type: Some(TxType::GENESIS),
                    genesis_info: Some(genesis_info),
                    ..empty_entry()
                }],
                outputs: vec![
                    None,
                    token_amount::<0>(1234),
                    token_baton::<0>(),
                ],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(mem_tokens().tx_token_inputs(&txid(3)), None);
        assert_eq!(
            mem_tokens().spent_token(&outpoint(3, 1))?,
            spent_amount(meta_slp(TOKEN_ID3, Fungible), 1234),
        );
        assert_eq!(
            mem_tokens().spent_token(&outpoint(3, 2))?,
            spent_baton(meta_slp(TOKEN_ID3, Fungible)),
        );

        // Tx 4: Add SLP V2 Mint Vault GENESIS
        let mint_vault_scripthash = ShaRmd160([2; 20]);
        let genesis_info = GenesisInfo {
            token_ticker: b"SLP Mint Vault".as_ref().into(),
            token_name: b"Mint Vault SLP token".as_ref().into(),
            url: b"https://mintvault.slp/".as_ref().into(),
            mint_vault_scripthash: Some(mint_vault_scripthash),
            hash: Some([55; 32]),
            decimals: 4,
            ..Default::default()
        };
        add_to_mempool(make_tx(
            4,
            [],
            1,
            genesis_opreturn(&genesis_info, MintVault, None, 1000),
        ))?;
        assert_eq!(mem_tokens().genesis_info(&txid(4)), Some(&genesis_info));
        assert_eq!(
            mem_tokens().token_tx(&txid(4)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID4, MintVault),
                    tx_type: Some(TxType::GENESIS),
                    genesis_info: Some(genesis_info),
                    ..empty_entry()
                }],
                outputs: vec![None, token_amount::<0>(1000)],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(mem_tokens().tx_token_inputs(&txid(4)), None);

        // Tx 5: Add SLP NFT1 GROUP GENESIS
        add_to_mempool(make_tx(
            5,
            [],
            2,
            genesis_opreturn(&GenesisInfo::empty_slp(), Nft1Group, Some(2), 10),
        ))?;
        assert_eq!(
            mem_tokens().genesis_info(&txid(5)),
            Some(&GenesisInfo::empty_slp()),
        );
        assert_eq!(
            mem_tokens().token_tx(&txid(5)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID5, Nft1Group),
                    tx_type: Some(TxType::GENESIS),
                    genesis_info: Some(GenesisInfo::empty_slp()),
                    ..empty_entry()
                }],
                outputs: vec![None, token_amount::<0>(10), token_baton::<0>()],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(mem_tokens().tx_token_inputs(&txid(5)), None);

        // Tx 6: Invalid mempool SLP V2 Mint Vault MINT: GENESIS still in
        // mempool, but needs at least 1 confirmation
        add_to_mempool(make_tx_with_scripts(
            6,
            [(4, 0, Script::p2sh(&mint_vault_scripthash))],
            3,
            mint_vault_opreturn(&TOKEN_ID4, [1, 2, 3]),
        ))?;
        assert_eq!(
            mem_tokens().token_tx(&txid(6)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID4, MintVault),
                    tx_type: Some(TxType::MINT),
                    is_invalid: true,
                    burn_error: Some(BurnError::MissingMintVault),
                    ..empty_entry()
                }],
                outputs: vec![None, None, None, None],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(mem_tokens().tx_token_inputs(&txid(6)), None);

        // Tx 7: Valid SEND of mempool GENESIS output (NftGroup)
        add_to_mempool(make_tx(
            7,
            [(5, 1)],
            4,
            send_opreturn(&TOKEN_ID5, Nft1Group, &[1, 2, 3, 4]),
        ))?;
        assert_eq!(
            mem_tokens().token_tx(&txid(7)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID5, Nft1Group),
                    tx_type: Some(TxType::SEND),
                    ..empty_entry()
                }],
                outputs: vec![
                    None,
                    token_amount::<0>(1),
                    token_amount::<0>(2),
                    token_amount::<0>(3),
                    token_amount::<0>(4),
                ],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(
            mem_tokens().tx_token_inputs(&txid(7)),
            Some([spent_amount(meta_slp(TOKEN_ID5, Nft1Group), 10)].as_ref()),
        );

        // Tx 8: Valid NFT1 CHILD GENESIS using mempool SEND output, also burn
        // some SLP V2 Mint Vault tokens
        add_to_mempool(make_tx(
            8,
            [(7, 1), (4, 1)],
            1,
            genesis_opreturn(&GenesisInfo::empty_slp(), Nft1Child, None, 1),
        ))?;
        assert_eq!(
            mem_tokens().genesis_info(&txid(8)),
            Some(&GenesisInfo::empty_slp()),
        );
        assert_eq!(
            mem_tokens().token_tx(&txid(8)),
            Some(&TokenTx {
                entries: vec![
                    TokenTxEntry {
                        meta: meta_slp(TOKEN_ID8, Nft1Child),
                        tx_type: Some(TxType::GENESIS),
                        group_token_meta: Some(meta_slp(TOKEN_ID5, Nft1Group)),
                        genesis_info: Some(GenesisInfo::empty_slp()),
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta_slp(TOKEN_ID4, MintVault),
                        is_invalid: true,
                        actual_burn_amount: 1000,
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta_slp(TOKEN_ID5, Nft1Group),
                        ..empty_entry()
                    },
                ],
                outputs: vec![None, token_amount::<0>(1)],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(
            mem_tokens().tx_token_inputs(&txid(8)),
            Some(
                [
                    spent_amount(meta_slp(TOKEN_ID5, Nft1Group), 1),
                    spent_amount(meta_slp(TOKEN_ID4, MintVault), 1000),
                ]
                .as_ref()
            ),
        );

        // Mine all txs in the mempool
        generate()?;

        // Tx 9: Invalid SLP V2 Mint Vault MINT: GENESIS now confirmed, but
        // wrong mint_vault_scriphash
        add_to_mempool(make_tx_with_scripts(
            9,
            [(4, 0, Script::p2sh(&ShaRmd160([99; 20])))],
            1,
            mint_vault_opreturn(&TOKEN_ID4, [123]),
        ))?;
        assert_eq!(
            mem_tokens().token_tx(&txid(9)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID4, MintVault),
                    tx_type: Some(TxType::MINT),
                    is_invalid: true,
                    burn_error: Some(BurnError::MissingMintVault),
                    ..empty_entry()
                }],
                outputs: vec![None, None],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(mem_tokens().tx_token_inputs(&txid(9)), None);

        // Tx 10: Valid SLP V2 Mint Vault MINT: GENESIS now confirmed
        add_to_mempool(make_tx_with_scripts(
            10,
            [(4, 0, Script::p2sh(&mint_vault_scripthash))],
            1,
            mint_vault_opreturn(&TOKEN_ID4, [123]),
        ))?;
        assert_eq!(
            mem_tokens().token_tx(&txid(10)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID4, MintVault),
                    tx_type: Some(TxType::MINT),
                    ..empty_entry()
                }],
                outputs: vec![None, token_amount::<0>(123)],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(mem_tokens().tx_token_inputs(&txid(10)), None);

        // Valid SEND using both mempool and DB inputs
        add_to_mempool(make_tx(
            11,
            [(3, 1), (8, 1), (10, 1)],
            4,
            send_opreturn(&TOKEN_ID3, Fungible, &[100, 200, 300, 400]),
        ))?;
        assert_eq!(
            mem_tokens().token_tx(&txid(11)),
            Some(&TokenTx {
                entries: vec![
                    TokenTxEntry {
                        meta: meta_slp(TOKEN_ID3, Fungible),
                        tx_type: Some(TxType::SEND),
                        actual_burn_amount: 234,
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta_slp(TOKEN_ID4, MintVault),
                        is_invalid: true,
                        actual_burn_amount: 123,
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta_slp(TOKEN_ID8, Nft1Child),
                        group_token_meta: Some(meta_slp(TOKEN_ID5, Nft1Group)),
                        is_invalid: true,
                        actual_burn_amount: 1,
                        ..empty_entry()
                    },
                ],
                outputs: vec![
                    None,
                    token_amount::<0>(100),
                    token_amount::<0>(200),
                    token_amount::<0>(300),
                    token_amount::<0>(400),
                ],
                failed_parsings: vec![],
            }),
        );
        assert_eq!(
            mem_tokens().tx_token_inputs(&txid(11)),
            Some(
                [
                    spent_amount(meta_slp(TOKEN_ID3, Fungible), 1234),
                    spent_amount_group(
                        meta_slp(TOKEN_ID8, Nft1Child),
                        1,
                        meta_slp(TOKEN_ID5, Nft1Group),
                    ),
                    spent_amount(meta_slp(TOKEN_ID4, MintVault), 123),
                ]
                .as_ref()
            ),
        );

        // Bare burn
        add_to_mempool(make_tx(12, [(11, 2)], 2, Script::default()))?;
        assert_eq!(
            mem_tokens().token_tx(&txid(12)),
            Some(&TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta_slp(TOKEN_ID3, Fungible),
                    tx_type: None,
                    is_invalid: true,
                    actual_burn_amount: 200,
                    ..empty_entry()
                }],
                outputs: vec![None; 3],
                ..Default::default()
            }),
        );
        assert_eq!(
            mem_tokens().tx_token_inputs(&txid(12)),
            Some([spent_amount(meta_slp(TOKEN_ID3, Fungible), 200)].as_ref()),
        );

        // Test fetch_tx_spent_tokens

        // Tx fff...fff not found
        assert_eq!(
            mem_tokens().fetch_tx_spent_tokens(
                &make_tx(1, [(0xff, 0)], 0, Script::default()),
                &db,
                is_mempool_tx,
            )?,
            Err(MempoolTokensError::InputTxNotFound(TxId::new([0xff; 32]))),
        );

        // Tx 11 in the mempool but no such output
        assert_eq!(
            mem_tokens().fetch_tx_spent_tokens(
                &make_tx(1, [(11, 9999)], 0, Script::default()),
                &db,
                is_mempool_tx,
            )?,
            Err(MempoolTokensError::InputTxNoSuchOutput(outpoint(11, 9999))),
        );

        // Tx 3 in the DB but no such output
        assert_eq!(
            mem_tokens().fetch_tx_spent_tokens(
                &make_tx(1, [(3, 9999)], 0, Script::default()),
                &db,
                is_mempool_tx,
            )?,
            Err(MempoolTokensError::InputTxNoSuchOutput(outpoint(3, 9999))),
        );

        // Force-delete TokenMeta for TOKEN_ID4 (MintVault), simulate corruption
        let mut batch = rocksdb::WriteBatch::default();
        batch.delete_cf(db.cf(CF_TOKEN_META)?, tx_num_to_bytes(4));
        db.write_batch(batch)?;

        // Now the TokenMeta for an input with that token ID fails to load
        assert_eq!(
            mem_tokens()
                .fetch_tx_spent_tokens(
                    &make_tx(1, [(4, 1)], 0, Script::default()),
                    &db,
                    is_mempool_tx,
                )
                .unwrap_err()
                .downcast::<TokenIndexError>()?,
            TokenIndexError::TokenTxNumNotFound(4),
        );

        // However, if the output doesn't have a token assigned, we don't even
        // query that TokenMeta, so this will work fine:
        assert_eq!(
            mem_tokens().fetch_tx_spent_tokens(
                &make_tx(1, [(4, 0)], 0, Script::default()),
                &db,
                is_mempool_tx,
            )?,
            Ok(vec![None]),
        );

        // Tx 8 burns some (force-deleted) Token 4, but this is not queried
        // either, so this succeeds, too:
        assert_eq!(
            mem_tokens().fetch_tx_spent_tokens(
                &make_tx(1, [(8, 1)], 0, Script::default()),
                &db,
                is_mempool_tx,
            )?,
            Ok(vec![spent_amount_group(
                meta_slp(TOKEN_ID8, Nft1Child),
                1,
                meta_slp(TOKEN_ID5, Nft1Group),
            )]),
        );

        // Remove tx 12 from mempool
        remove_from_mempool(&txid(12));
        assert_eq!(mem_tokens().token_tx(&txid(12)), None);
        assert_eq!(mem_tokens().tx_token_inputs(&txid(12)), None);

        // Remove tx 11 from mempool
        remove_from_mempool(&txid(11));
        assert_eq!(mem_tokens().token_tx(&txid(11)), None);
        assert_eq!(mem_tokens().tx_token_inputs(&txid(11)), None);

        // Remove tx 10 from mempool
        remove_from_mempool(&txid(10));
        assert_eq!(mem_tokens().token_tx(&txid(10)), None);
        assert_eq!(mem_tokens().tx_token_inputs(&txid(10)), None);

        Ok(())
    }
}
