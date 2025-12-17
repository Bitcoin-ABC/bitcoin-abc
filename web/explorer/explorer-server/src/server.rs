use std::path::PathBuf;
use std::{
    borrow::Cow,
    collections::{hash_map::Entry, HashMap, HashSet},
};

use abc_rust_error::Result;
use askama::Template;
use axum::{response::Redirect, routing::get, Router};
use bitcoinsuite_chronik_client::proto::{
    token_type, ScriptUtxo, SlpTokenType, TokenEntry, TokenInfo, TokenTxType,
    TokenType, Tx,
};
use bitcoinsuite_chronik_client::{proto::OutPoint, ChronikClient};
use bitcoinsuite_core::{
    address::CashAddress,
    hash::{Hashed, Sha256d},
};
use chrono::{TimeZone, Utc};
use eyre::{bail, eyre};
use futures::future;

use crate::{
    api::{
        block_txs_to_json, calc_tx_stats, tokens_to_json, tx_history_to_json,
    },
    blockchain::{
        calculate_block_difficulty, cash_addr_to_script_type_payload,
        to_be_hex, to_legacy_address,
    },
    chain::Chain,
    server_http::{
        address, address_qr, block, block_height, blocks, data_address_txs,
        data_block_txs, data_blocks, search, serve_files, testnet_faucet, tx,
    },
    server_primitives::{
        JsonBalance, JsonBlock, JsonBlocksResponse, JsonTxsResponse, JsonUtxo,
    },
    templating::{
        AddressTemplate, BlockTemplate, BlocksTemplate, TestnetFaucetTemplate,
        TokenEntryTemplate, TransactionTemplate,
    },
};

pub struct Server {
    chronik: ChronikClient,
    base_dir: PathBuf,
    chain: Chain,
    satoshi_addr_prefix: &'static str,
    tokens_addr_prefix: &'static str,
    token_icon_url: &'static str,
    network_selector: bool,
}

impl Server {
    pub async fn setup(
        chronik: ChronikClient,
        base_dir: PathBuf,
        chain: Chain,
        network_selector: bool,
    ) -> Result<Self> {
        Ok(Server {
            chronik,
            base_dir,
            chain: chain.clone(),
            satoshi_addr_prefix: match chain {
                Chain::Mainnet => "ecash",
                Chain::Testnet => "ectest",
                Chain::Regtest => "ecregtest",
            },
            tokens_addr_prefix: "etoken",
            token_icon_url: "https://icons.etokens.cash",
            network_selector,
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
            .route("/testnet-faucet", get(testnet_faucet))
    }
}

impl Server {
    pub async fn blocks(&self) -> Result<String> {
        let blockchain_info = self.chronik.blockchain_info().await?;

        let blocks_template = BlocksTemplate {
            last_block_height: blockchain_info.tip_height as u32,
            network_selector: self.network_selector,
        };

        Ok(blocks_template.render().unwrap())
    }
}

impl Server {
    pub async fn testnet_faucet(&self) -> Result<String> {
        let testnet_faucet_template = TestnetFaucetTemplate {
            network_selector: self.network_selector,
        };

        Ok(testnet_faucet_template.render().unwrap())
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
        let block_hash = Sha256d::from_be_hex(block_hex)?;
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
                    Sha256d::from_be_hex(&token_entry.token_id)
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
        let address = address.parse()?;
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
                    Sha256d::from_be_hex(&token_entry.token_id)
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
        let block_hash = Sha256d::from_be_hex(block_hex)?;

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

        let block_template = BlockTemplate {
            block_hex,
            block_info,
            timestamp,
            difficulty,
            coinbase_data,
            best_height,
            network_selector: self.network_selector,
        };

        Ok(block_template.render().unwrap())
    }

    pub async fn tx(&self, tx_hex: &str) -> Result<String> {
        let tx_hash = Sha256d::from_be_hex(tx_hex)?;
        let tx = self.chronik.tx(&tx_hash).await?;

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
        let raw_tx = hex::encode(raw_tx);

        let tx_stats = calc_tx_stats(&tx, None);

        let token_entries = futures::future::join_all(
            tx.token_entries
                .iter()
                .map(|entry| self.token_entry(&tx, entry)),
        )
        .await
        .into_iter()
        .collect::<Result<Vec<_>>>()?;

        let (title, is_token) = match token_entries.as_slice() {
            [] => match tx.token_failed_parsings.as_slice() {
                [] => (Cow::Borrowed("eCash Transaction"), false),
                [..] => (Cow::Borrowed("Invalid eToken Transaction"), false),
            },
            [entry] => match &entry.genesis_info {
                Some(genesis_info) => (
                    format!(
                        "{} Transaction",
                        String::from_utf8_lossy(&genesis_info.token_ticker)
                    )
                    .into(),
                    true,
                ),
                None => ("Unknown eToken Transaction".into(), true),
            },
            [..] => ("Multi eToken Transaction".into(), true),
        };

        let transaction_template = TransactionTemplate {
            title: &title,
            sats_addr_prefix: self.satoshi_addr_prefix,
            tokens_addr_prefix: self.tokens_addr_prefix,
            is_token,
            tx_hex,
            tx: &tx,
            token_entries,
            sats_input: tx_stats.sats_input,
            sats_output: tx_stats.sats_output,
            raw_tx,
            confirmations,
            timestamp,
            token_icon_url: self.token_icon_url,
            network_selector: self.network_selector,
        };

        Ok(transaction_template.render().unwrap())
    }

    async fn token_entry<'a>(
        &self,
        tx: &Tx,
        token_entry: &'a TokenEntry,
    ) -> Result<TokenEntryTemplate<'a>> {
        let token_id = Sha256d::from_be_hex(&token_entry.token_id)?;
        let tx_type = TokenTxType::from_i32(token_entry.tx_type)
            .ok_or_else(|| eyre!("Malformed token_entry.tx_type"))?;
        let token_data = match tx_type {
            TokenTxType::Unknown => None,
            // In the event of an invalid tx with a non existing token id, the
            // call to chronik.token() will fail.
            _ => self.chronik.token(&token_id).await.ok(),
        };
        let token_type = token_entry
            .token_type
            .clone()
            .ok_or_else(|| eyre!("Malformed token_entry.token_type"))?
            .token_type
            .ok_or_else(|| eyre!("Malformed token_entry.token_type"))?;

        let action_str = match tx_type {
            TokenTxType::Genesis => "GENESIS",
            TokenTxType::Mint => "MINT",
            TokenTxType::Send => "SEND",
            TokenTxType::Burn => "BURN",
            _ => "Unknown",
        };

        let (token_type_str, specification) = match token_type {
            token_type::TokenType::Slp(slp) => {
                let slp_token_type = SlpTokenType::from_i32(slp)
                    .ok_or_else(|| eyre!("Malformed SlpTokenType"))?;
                match slp_token_type {
                    SlpTokenType::Fungible => (
                        "SLP Type 1",
                        "https://github.com/simpleledger/\
                            slp-specifications/blob/master/\
                            slp-token-type-1.md",
                    ),
                    SlpTokenType::MintVault => (
                        "SLP Type 2",
                        "https://github.com/badger-cash/\
                            slp-specifications/blob/master/\
                            slp-token-type-2.md",
                    ),
                    SlpTokenType::Nft1Group => (
                        "SLP NFT-1 Group",
                        "https://github.com/simpleledger/\
                            slp-specifications/blob/master/slp-nft-1.md",
                    ),
                    SlpTokenType::Nft1Child => (
                        "SLP NFT-1 Child",
                        "https://github.com/simpleledger/\
                            slp-specifications/blob/master/slp-nft-1.md",
                    ),
                    _ => ("Unknown", "Unknown"),
                }
            }
            token_type::TokenType::Alp(_) => (
                "ALP",
                "https://ecashbuilders.notion.site/\
                    ALP-a862a4130877448387373b9e6a93dd97",
            ),
        };

        let token_section_title = format!(
            "Token Details ({}{} {} Transaction)",
            if token_entry.is_invalid {
                "Invalid "
            } else {
                ""
            },
            &token_type_str,
            &action_str,
        );

        let token_input: i128 = tx
            .inputs
            .iter()
            .filter_map(|input| input.token.as_ref())
            .filter(|token| token.token_id == token_entry.token_id)
            .map(|token| token.atoms as i128)
            .sum();
        let token_output: i128 = tx
            .outputs
            .iter()
            .filter_map(|output| output.token.as_ref())
            .filter(|token| token.token_id == token_entry.token_id)
            .map(|token| token.atoms as i128)
            .sum();

        Ok(TokenEntryTemplate {
            token_section_title,
            token_hex: token_id.hex_be(),
            entry: token_entry,
            genesis_info: token_data
                .as_ref()
                .and_then(|token_data| token_data.genesis_info.clone()),
            token_input,
            token_output,
            action_str,
            specification,
            token_type: token_type_str,
        })
    }
}

impl Server {
    pub async fn address<'a>(&'a self, address: &str) -> Result<String> {
        let address = address.parse::<CashAddress>()?;
        let sats_address = address.with_prefix(self.satoshi_addr_prefix);
        let token_address = address.with_prefix(self.tokens_addr_prefix);

        let legacy_address = to_legacy_address(&address, &self.chain);
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
                sats_amount: utxo.sats,
                token_amount: 0,
                is_coinbase: utxo.is_coinbase,
                block_height: utxo.block_height,
            };

            match &utxo.token {
                Some(token) => {
                    let token_id_hash = Sha256d::from_be_hex(&token.token_id)
                        .expect("Impossible");

                    json_utxo.token_amount = token.atoms;

                    match json_balances.entry(token.token_id.clone()) {
                        Entry::Occupied(mut entry) => {
                            let entry = entry.get_mut();
                            entry.sats_amount += utxo.sats;
                            entry.token_amount += i128::from(token.atoms);
                            entry.utxos.push(json_utxo);
                        }
                        Entry::Vacant(entry) => {
                            entry.insert(JsonBalance {
                                token_id: Some(token.token_id.clone()),
                                sats_amount: utxo.sats,
                                token_amount: token.atoms.into(),
                                utxos: vec![json_utxo],
                            });
                        }
                    }

                    token_ids.insert(token_id_hash);
                    token_dust += utxo.sats;
                    token_utxos.push(utxo);
                }
                _ => {
                    total_xec += utxo.sats;
                    main_json_balance.utxos.push(json_utxo);
                }
            };
        }
        json_balances.insert(String::from("main"), main_json_balance);

        let tokens = self.batch_get_chronik_tokens(token_ids).await?;
        let json_tokens = tokens_to_json(&tokens)?;

        let encoded_tokens = serde_json::to_string(&json_tokens)?
            .replace('\'', r"\'")
            .replace("<", "\\x3c")
            .replace(">", "\\x3e");
        let encoded_balances = serde_json::to_string(&json_balances)?
            .replace('\'', r"\'")
            .replace("<", "\\x3c")
            .replace(">", "\\x3e");

        let address_template = AddressTemplate {
            tokens,
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
            token_icon_url: &self.token_icon_url,
            network_selector: self.network_selector,
        };

        Ok(address_template.render().unwrap())
    }

    pub async fn batch_get_chronik_tokens(
        &self,
        token_ids: HashSet<Sha256d>,
    ) -> Result<HashMap<String, TokenInfo>> {
        let mut token_calls = Vec::new();

        let unknown_token = Sha256d::from_be_hex(
            "0000000000000000000000000000000000000000000000000000000000000000",
        )?;

        for token_id in token_ids.iter() {
            if token_id != &unknown_token {
                token_calls.push(Box::pin(self.chronik.token(token_id)));
            }
        }

        let tokens = future::join_all(token_calls).await;
        // It is very possible to create a token tx with an invalid token id. In
        // this case chronik has no such token indexed and the call will fail.
        let token_map: HashMap<String, TokenInfo> = tokens
            .into_iter()
            .filter_map(|token| token.ok())
            .map(|token| (token.token_id.clone(), token))
            .collect();

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
        if let Ok(address) = query.parse::<CashAddress>() {
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

        let unknown_hash = Sha256d::from_be_hex(query)?;

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
