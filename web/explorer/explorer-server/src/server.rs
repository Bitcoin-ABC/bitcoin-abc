use std::path::PathBuf;
use std::{
    borrow::Cow,
    collections::{hash_map::Entry, HashMap, HashSet},
};

use askama::Template;
use axum::{response::Redirect, routing::get, Router};
use bitcoinsuite_chronik_client::proto::{
    token_type, AlpTokenType, ScriptUtxo, SlpTokenType, TokenInfo, TokenTxType,
    TokenType,
};
use bitcoinsuite_chronik_client::{proto::OutPoint, ChronikClient};
use bitcoinsuite_core::{CashAddress, Hashed, Sha256d};
use bitcoinsuite_error::Result;
use chrono::{TimeZone, Utc};
use eyre::{bail, eyre};
use futures::future;

use crate::{
    api::{
        block_txs_to_json, calc_tx_stats, tokens_to_json, tx_history_to_json,
    },
    blockchain::{
        calculate_block_difficulty, cash_addr_to_script_type_payload,
        from_be_hex, to_be_hex, to_legacy_address,
    },
    chain::Chain,
    server_http::{
        address, address_qr, block, block_height, blocks, data_address_txs,
        data_block_txs, data_blocks, search, serve_files, tx,
    },
    server_primitives::{
        JsonBalance, JsonBlock, JsonBlocksResponse, JsonTxsResponse, JsonUtxo,
    },
    templating::{
        AddressTemplate, BlockTemplate, BlocksTemplate, TransactionTemplate,
    },
};

pub struct Server {
    chronik: ChronikClient,
    base_dir: PathBuf,
    satoshi_addr_prefix: &'static str,
    tokens_addr_prefix: &'static str,
}

impl Server {
    pub async fn setup(
        chronik: ChronikClient,
        base_dir: PathBuf,
        chain: Chain,
    ) -> Result<Self> {
        Ok(Server {
            chronik,
            base_dir,
            satoshi_addr_prefix: match chain {
                Chain::Mainnet => "ecash",
                Chain::Testnet => "ectest",
                Chain::Regtest => "ecregtest",
            },
            tokens_addr_prefix: "etoken",
        })
    }

    pub fn router(&self) -> Router {
        Router::new()
            .route("/", get(blocks))
            .route("/tx/:hash", get(tx))
            .route("/blocks", get(blocks))
            .route("/block/:hash", get(block))
            .route("/block-height/:height", get(block_height))
            .route("/address/:hash", get(address))
            .route("/address-qr/:hash", get(address_qr))
            .route("/search/:query", get(search))
            .route("/api/blocks/:start_height/:end_height", get(data_blocks))
            .route(
                "/api/block/:hash/transactions/:page/:page_size",
                get(data_block_txs),
            )
            .route("/api/address/:hash/transactions", get(data_address_txs))
            .nest("/code", serve_files(&self.base_dir.join("code")))
            .nest("/assets", serve_files(&self.base_dir.join("assets")))
            .nest(
                "/favicon.ico",
                serve_files(&self.base_dir.join("assets").join("favicon.png")),
            )
    }
}

impl Server {
    pub async fn blocks(&self) -> Result<String> {
        let blockchain_info = self.chronik.blockchain_info().await?;

        let blocks_template = BlocksTemplate {
            last_block_height: blockchain_info.tip_height as u32,
        };

        Ok(blocks_template.render().unwrap())
    }
}

impl Server {
    fn is_unknown_slp(token_type_in: &Option<TokenType>) -> Result<bool> {
        let token_type = token_type_in
            .clone()
            .ok_or_else(|| eyre!("Malformed token.token_type"))?
            .token_type
            .ok_or_else(|| eyre!("Malformed token.token_type.token_type"))?;

        let is_unknown_slp = match token_type {
            token_type::TokenType::Slp(slp) => {
                let slp_token_type = SlpTokenType::from_i32(slp)
                    .ok_or_else(|| eyre!("Malformed SlpTokenType"))?;
                match slp_token_type {
                    SlpTokenType::None => true,
                    _ => false,
                }
            }
            _ => false,
        };

        Ok(is_unknown_slp)
    }

    pub async fn data_blocks(
        &self,
        start_height: i32,
        end_height: i32,
    ) -> Result<JsonBlocksResponse> {
        let blocks = self.chronik.blocks(start_height, end_height).await?;

        let mut json_blocks = Vec::with_capacity(blocks.len());
        for block in blocks.into_iter().rev() {
            json_blocks.push(JsonBlock {
                hash: to_be_hex(&block.hash),
                height: block.height,
                timestamp: block.timestamp,
                difficulty: calculate_block_difficulty(block.n_bits),
                size: block.block_size,
                num_txs: block.num_txs,
                is_final: block.is_final,
            });
        }

        Ok(JsonBlocksResponse { data: json_blocks })
    }

    pub async fn data_block_txs(
        &self,
        block_hex: &str,
        page: usize,
        page_size: usize,
    ) -> Result<JsonTxsResponse> {
        let block_hash = Sha256d::from_hex_be(block_hex)?;
        let block = self.chronik.block_by_hash(&block_hash).await?;
        let block_txs = self
            .chronik
            .block_txs_by_hash_with_page_size(&block_hash, page, page_size)
            .await?;

        let token_ids = block_txs
            .txs
            .iter()
            .filter_map(|tx| {
                let token_entry = tx.token_entries.get(0)?;
                if Self::is_unknown_slp(&token_entry.token_type).ok()? {
                    return None;
                }
                Some(
                    Sha256d::from_hex_be(&token_entry.token_id)
                        .expect("Impossible"),
                )
            })
            .collect::<HashSet<_>>();

        let tokens_by_hex = self.batch_get_chronik_tokens(token_ids).await?;

        let json_txs = block_txs_to_json(block, block_txs, &tokens_by_hex)?;

        Ok(JsonTxsResponse { data: json_txs })
    }

    pub async fn data_address_txs(
        &self,
        address: &str,
        query: HashMap<String, String>,
    ) -> Result<JsonTxsResponse> {
        let address = CashAddress::parse_cow(address.into())?;
        let (script_type, script_payload) =
            cash_addr_to_script_type_payload(&address);
        let script_endpoint = self.chronik.script(script_type, &script_payload);

        let page: usize = query
            .get("page")
            .map(|s| s.as_str())
            .unwrap_or("0")
            .parse()?;
        let take: usize = query
            .get("take")
            .map(|s| s.as_str())
            .unwrap_or("200")
            .parse()?;
        let address_tx_history =
            script_endpoint.history_with_page_size(page, take).await?;

        let token_ids = address_tx_history
            .txs
            .iter()
            .filter_map(|tx| {
                let token_entry = tx.token_entries.get(0)?;
                if Self::is_unknown_slp(&token_entry.token_type).ok()? {
                    return None;
                }
                Some(
                    Sha256d::from_hex_be(&token_entry.token_id)
                        .expect("Impossible"),
                )
            })
            .collect();

        let tokens = self.batch_get_chronik_tokens(token_ids).await?;
        let json_tokens = tokens_to_json(&tokens)?;

        let json_txs =
            tx_history_to_json(&address, address_tx_history, &json_tokens)?;

        Ok(JsonTxsResponse { data: json_txs })
    }
}

impl Server {
    pub async fn block(&self, block_hex: &str) -> Result<String> {
        let block_hash = Sha256d::from_hex_be(block_hex)?;

        let block = self.chronik.block_by_hash(&block_hash).await?;
        let block_txs = self
            .chronik
            .block_txs_by_hash_with_page_size(&block_hash, 0, 1)
            .await?;
        let block_info =
            block.block_info.ok_or_else(|| eyre!("Block has no info"))?;

        let blockchain_info = self.chronik.blockchain_info().await?;
        let best_height = blockchain_info.tip_height;

        let difficulty = calculate_block_difficulty(block_info.n_bits);
        let timestamp =
            Utc.timestamp_nanos(block_info.timestamp * 1_000_000_000);
        let coinbase_data = block_txs.txs[0].inputs[0].input_script.clone();
        let confirmations = best_height - block_info.height + 1;

        let block_template = BlockTemplate {
            block_hex,
            block_info,
            confirmations,
            timestamp,
            difficulty,
            coinbase_data,
            best_height,
        };

        Ok(block_template.render().unwrap())
    }

    pub async fn tx(&self, tx_hex: &str) -> Result<String> {
        let tx_hash = Sha256d::from_hex_be(tx_hex)?;
        let tx = self.chronik.tx(&tx_hash).await?;
        let token_entry = tx
            .token_entries
            .get(0)
            .and_then(|entry| Some(entry.clone()));

        let (token_id, token) = match &token_entry {
            Some(token_entry) => {
                let token_id = Sha256d::from_hex_be(&token_entry.token_id)?;
                let mut token = None;
                let tx_type = TokenTxType::from_i32(token_entry.tx_type)
                    .ok_or_else(|| eyre!("Malformed token_entry.tx_type"))?;
                if tx_type != TokenTxType::Unknown {
                    token = Some(self.chronik.token(&token_id).await?);
                }
                (Some(token_id), token)
            }
            None => (None, None),
        };
        let token_ticker = token.as_ref().and_then(|token| {
            Some(String::from_utf8_lossy(
                &token.genesis_info.as_ref()?.token_ticker,
            ))
        });

        let (title, is_token): (Cow<str>, bool) = match &token_ticker {
            Some(token_ticker) => {
                (format!("{} Transaction", token_ticker).into(), true)
            }
            None => match &tx.token_failed_parsings.get(0) {
                None => ("eCash Transaction".into(), false),
                Some(_) => ("Invalid eToken Transaction".into(), true),
            },
        };

        let token_hex = token_id.as_ref().map(|token| token.to_hex_be());

        let (token_section_title, action_str, token_type_str, specification): (
            Cow<str>,
            Cow<str>,
            Cow<str>,
            Cow<str>,
        ) = match &token_entry {
            Some(token_entry) => {
                let token_type = token_entry
                    .token_type
                    .clone()
                    .ok_or_else(|| eyre!("Malformed token_entry.token_type"))?
                    .token_type
                    .ok_or_else(|| eyre!("Malformed token_entry.token_type"))?;
                let tx_type = TokenTxType::from_i32(token_entry.tx_type)
                    .ok_or_else(|| eyre!("Malformed token_entry.tx_type"))?;

                let action_str = match token_type {
                    token_type::TokenType::Slp(slp) => {
                        let slp_token_type = SlpTokenType::from_i32(slp)
                            .ok_or_else(|| eyre!("Malformed SlpTokenType"))?;
                        match (slp_token_type, tx_type) {
                            (SlpTokenType::Fungible, TokenTxType::Genesis) => {
                                "SLP GENESIS"
                            }
                            (SlpTokenType::Fungible, TokenTxType::Mint) => {
                                "SLP MINT"
                            }
                            (SlpTokenType::Fungible, TokenTxType::Send) => {
                                "SLP SEND"
                            }
                            (SlpTokenType::Fungible, TokenTxType::Burn) => {
                                "SLP BURN"
                            }
                            (SlpTokenType::Nft1Group, TokenTxType::Genesis) => {
                                "NFT1 GROUP GENESIS"
                            }
                            (SlpTokenType::Nft1Group, TokenTxType::Mint) => {
                                "NFT1 GROUP MINT"
                            }
                            (SlpTokenType::Nft1Group, TokenTxType::Send) => {
                                "NFT1 GROUP SEND"
                            }
                            (SlpTokenType::Nft1Group, TokenTxType::Burn) => {
                                "NFT1 GROUP BURN"
                            }
                            (SlpTokenType::Nft1Child, TokenTxType::Genesis) => {
                                "NFT1 Child GENESIS"
                            }
                            (SlpTokenType::Nft1Child, TokenTxType::Send) => {
                                "NFT1 Child SEND"
                            }
                            (SlpTokenType::Nft1Child, TokenTxType::Burn) => {
                                "NFT1 Child BURN"
                            }
                            (SlpTokenType::MintVault, TokenTxType::Genesis) => {
                                "SLP Type2 GENESIS"
                            }
                            (SlpTokenType::MintVault, TokenTxType::Mint) => {
                                "SLP Type2 MINT"
                            }
                            (SlpTokenType::MintVault, TokenTxType::Send) => {
                                "SLP Type2 SEND"
                            }
                            (SlpTokenType::MintVault, TokenTxType::Burn) => {
                                "SLP Type2 BURN"
                            }
                            _ => "SLP Unknown",
                        }
                    }
                    token_type::TokenType::Alp(alp) => {
                        let alp_token_type = AlpTokenType::from_i32(alp)
                            .ok_or_else(|| eyre!("Malformed AlpTokenType"))?;
                        match (alp_token_type, tx_type) {
                            (AlpTokenType::Standard, TokenTxType::Genesis) => {
                                "ALP GENESIS"
                            }
                            (AlpTokenType::Standard, TokenTxType::Mint) => {
                                "ALP MINT"
                            }
                            (AlpTokenType::Standard, TokenTxType::Send) => {
                                "ALP SEND"
                            }
                            (AlpTokenType::Standard, TokenTxType::Burn) => {
                                "ALP BURN"
                            }
                            _ => "ALP Unknown",
                        }
                    }
                };

                let (token_type_str, specification) = match token_type {
                    token_type::TokenType::Slp(slp) => {
                        let slp_token_type = SlpTokenType::from_i32(slp)
                            .ok_or_else(|| eyre!("Malformed SlpTokenType"))?;
                        match slp_token_type {
                            SlpTokenType::Fungible => {
                                (
                                    "SLP Type 1",
                                    "https://github.com/simpleledger/\
                                    slp-specifications/blob/master/\
                                    slp-token-type-1.md"
                                )
                            }
                            SlpTokenType::MintVault => {
                                (
                                    "SLP Type 2",
                                    "https://github.com/badger-cash/\
                                    slp-specifications/blob/master/\
                                    slp-token-type-2.md"
                                )
                            }
                            SlpTokenType::Nft1Group => {
                                (
                                    "SLP NFT-1 Group",
                                    "https://github.com/simpleledger/\
                                    slp-specifications/blob/master/slp-nft-1.md"
                                )
                            }
                            SlpTokenType::Nft1Child => {
                                (
                                    "SLP NFT-1 Child",
                                    "https://github.com/simpleledger/\
                                    slp-specifications/blob/master/slp-nft-1.md"
                                )
                            }
                            _ => ("Unknown", "Unknown")
                        }
                    }
                    token_type::TokenType::Alp(_) => {
                        (
                            "ALP",
                            "https://ecashbuilders.notion.site/\
                            ALP-a862a4130877448387373b9e6a93dd97"
                        )
                    }
                };

                (
                    format!(
                        "Token Details ({}{} Transaction)",
                        if token_entry.is_invalid {
                            "Invalid "
                        } else {
                            ""
                        },
                        &action_str,
                    )
                    .into(),
                    action_str.into(),
                    token_type_str.into(),
                    specification.into(),
                )
            }
            None => {
                if tx.token_failed_parsings.get(0).is_some() {
                    (
                        "Token Details (Invalid Transaction)".into(),
                        "Unknown".into(),
                        "Unknown".into(),
                        "Unknown".into(),
                    )
                } else {
                    (
                        "".into(),
                        "Unknown".into(),
                        "Unknown".into(),
                        "Unknown".into(),
                    )
                }
            }
        };

        let blockchain_info = self.chronik.blockchain_info().await?;
        let confirmations = match &tx.block {
            Some(block_meta) => {
                blockchain_info.tip_height - block_meta.height + 1
            }
            None => 0,
        };
        let timestamp = match &tx.block {
            Some(block_meta) => block_meta.timestamp,
            None => tx.time_first_seen,
        };
        let timestamp = Utc.timestamp_nanos(timestamp * 1_000_000_000);

        let raw_tx = self.chronik.raw_tx(&tx_hash).await?;
        let raw_tx = raw_tx.hex();

        let tx_stats = calc_tx_stats(&tx, None);

        let transaction_template = TransactionTemplate {
            title: &title,
            sats_addr_prefix: &self.satoshi_addr_prefix,
            tokens_addr_prefix: &self.tokens_addr_prefix,
            token_section_title: &token_section_title,
            is_token,
            tx_hex,
            token_hex,
            tx,
            slp_genesis_info: token.and_then(|token| token.genesis_info),
            slp_meta: token_entry,
            sats_input: tx_stats.sats_input,
            sats_output: tx_stats.sats_output,
            token_input: tx_stats.token_input,
            token_output: tx_stats.token_output,
            raw_tx,
            confirmations,
            timestamp,
            action_str: &action_str,
            specification: &specification,
            token_type: &token_type_str,
        };

        Ok(transaction_template.render().unwrap())
    }
}

impl Server {
    pub async fn address<'a>(&'a self, address: &str) -> Result<String> {
        let address = CashAddress::parse_cow(address.into())?;
        let sats_address = address.with_prefix(self.satoshi_addr_prefix);
        let token_address = address.with_prefix(self.tokens_addr_prefix);

        let legacy_address = to_legacy_address(&address);
        let sats_address = sats_address.as_str();
        let token_address = token_address.as_str();

        let (script_type, script_payload) =
            cash_addr_to_script_type_payload(&address);
        let script_endpoint = self.chronik.script(script_type, &script_payload);
        let page_size = 1;
        let address_tx_history =
            script_endpoint.history_with_page_size(0, page_size).await?;
        let address_num_txs = address_tx_history.num_pages;

        let utxos = script_endpoint.utxos().await?;

        let mut token_dust: i64 = 0;
        let mut total_xec: i64 = 0;

        let mut token_ids: HashSet<Sha256d> = HashSet::new();
        let mut token_utxos: Vec<ScriptUtxo> = Vec::new();
        let mut json_balances: HashMap<String, JsonBalance> = HashMap::new();
        let mut main_json_balance: JsonBalance = JsonBalance {
            token_id: None,
            sats_amount: 0,
            token_amount: 0,
            utxos: Vec::new(),
        };

        for utxo in utxos.into_iter() {
            let OutPoint { txid, out_idx } = &utxo.outpoint.as_ref().unwrap();
            let mut json_utxo = JsonUtxo {
                tx_hash: to_be_hex(txid),
                out_idx: *out_idx,
                sats_amount: utxo.value,
                token_amount: 0,
                is_coinbase: utxo.is_coinbase,
                block_height: utxo.block_height,
            };

            match &utxo.token {
                Some(token) => {
                    let token_id_hex = hex::encode(&token.token_id);
                    let token_id_hash = Sha256d::from_slice_be_or_null(
                        &token.token_id.as_bytes(),
                    );

                    json_utxo.token_amount = token.amount;

                    match json_balances.entry(token_id_hex) {
                        Entry::Occupied(mut entry) => {
                            let entry = entry.get_mut();
                            entry.sats_amount += utxo.value;
                            entry.token_amount += i128::from(token.amount);
                            entry.utxos.push(json_utxo);
                        }
                        Entry::Vacant(entry) => {
                            entry.insert(JsonBalance {
                                token_id: Some(hex::encode(&token.token_id)),
                                sats_amount: utxo.value,
                                token_amount: token.amount.into(),
                                utxos: vec![json_utxo],
                            });
                        }
                    }

                    token_ids.insert(token_id_hash);
                    token_dust += utxo.value;
                    token_utxos.push(utxo);
                }
                _ => {
                    total_xec += utxo.value;
                    main_json_balance.utxos.push(json_utxo);
                }
            };
        }
        json_balances.insert(String::from("main"), main_json_balance);

        let tokens = self.batch_get_chronik_tokens(token_ids).await?;
        let json_tokens = tokens_to_json(&tokens)?;

        let encoded_tokens =
            serde_json::to_string(&json_tokens)?.replace('\'', r"\'");
        let encoded_balances =
            serde_json::to_string(&json_balances)?.replace('\'', r"\'");

        let address_template = AddressTemplate {
            tokens,
            token_utxos,
            token_dust,
            total_xec,
            address_num_txs,
            address: address.as_str(),
            sats_address,
            token_address,
            legacy_address,
            json_balances,
            encoded_tokens,
            encoded_balances,
        };

        Ok(address_template.render().unwrap())
    }

    pub async fn batch_get_chronik_tokens(
        &self,
        token_ids: HashSet<Sha256d>,
    ) -> Result<HashMap<String, TokenInfo>> {
        let mut token_calls = Vec::new();
        let mut token_map = HashMap::new();

        let unknown_token = Sha256d::from_hex(
            "0000000000000000000000000000000000000000000000000000000000000000",
        )?;

        for token_id in token_ids.iter() {
            if token_id != &unknown_token {
                token_calls.push(Box::pin(self.chronik.token(token_id)));
            }
        }

        let tokens = future::try_join_all(token_calls).await?;
        for token in tokens.into_iter() {
            token_map.insert(hex::encode(&token.token_id), token);
        }

        Ok(token_map)
    }

    pub async fn address_qr(&self, address: &str) -> Result<Vec<u8>> {
        use qrcode_generator::QrCodeEcc;
        if address.len() > 60 {
            bail!("Invalid address length");
        }
        let png =
            qrcode_generator::to_png_to_vec(address, QrCodeEcc::Quartile, 140)?;
        Ok(png)
    }

    pub async fn block_height(&self, height: u32) -> Result<Redirect> {
        let block = self.chronik.block_by_height(height as i32).await.ok();

        match block {
            Some(block) => {
                let block_info = block.block_info.expect("Impossible");
                Ok(self.redirect(format!(
                    "/block/{}",
                    to_be_hex(&block_info.hash)
                )))
            }
            None => Ok(self.redirect("/404".into())),
        }
    }

    pub async fn search(&self, query: &str) -> Result<Redirect> {
        if let Ok(address) = CashAddress::parse_cow(query.into()) {
            return Ok(self.redirect(format!("/address/{}", address.as_str())));
        }

        // Check for prefixless address search
        if let Ok(address) = format!("{}:{}", self.satoshi_addr_prefix, query)
            .parse::<CashAddress>()
        {
            return Ok(self.redirect(format!("/address/{}", address.as_str())));
        }
        if let Ok(address) = format!("{}:{}", self.tokens_addr_prefix, query)
            .parse::<CashAddress>()
        {
            return Ok(self.redirect(format!("/address/{}", address.as_str())));
        }

        if let Ok(height) = query.parse::<i32>() {
            if self.chronik.block_by_height(height).await.is_ok() {
                return Ok(self.redirect(format!("/block-height/{}", query)));
            }
        }

        let bytes = from_be_hex(query)?;
        let unknown_hash = Sha256d::from_slice(&bytes)?;

        if self.chronik.tx(&unknown_hash).await.is_ok() {
            return Ok(self.redirect(format!("/tx/{}", query)));
        }
        if self.chronik.block_by_hash(&unknown_hash).await.is_ok() {
            return Ok(self.redirect(format!("/block/{}", query)));
        }

        Ok(self.redirect("/404".into()))
    }

    pub fn redirect(&self, url: String) -> Redirect {
        Redirect::permanent(&url)
    }
}
