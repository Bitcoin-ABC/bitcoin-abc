// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::HashMap;

use askama::Template;
use bitcoinsuite_chronik_client::proto::{
    BlockInfo, GenesisInfo, TokenEntry, TokenInfo, Tx,
};
use chrono::{DateTime, Utc};

use crate::{
    blockchain::Destination, file_hashes::FileHashes,
    server_primitives::JsonBalance,
};

mod filters;

#[derive(Template)]
#[template(path = "pages/blocks.html")]
pub struct BlocksTemplate {
    pub last_block_height: u32,
    pub network_selector: bool,
    pub hashes: FileHashes,
}

#[derive(Template)]
#[template(path = "pages/block.html")]
pub struct BlockTemplate<'a> {
    pub block_hex: &'a str,
    pub block_info: BlockInfo,
    pub timestamp: DateTime<chrono::Utc>,
    pub difficulty: f64,
    pub coinbase_data: Vec<u8>,
    pub best_height: i32,
    pub network_selector: bool,
    pub hashes: FileHashes,
}

#[derive(Template)]
#[template(path = "pages/transaction.html")]
pub struct TransactionTemplate<'a> {
    pub title: &'a str,
    pub sats_addr_prefix: &'a str,
    pub tokens_addr_prefix: &'a str,
    pub is_token: bool,
    pub tx_hex: &'a str,
    pub raw_tx: String,
    pub tx: &'a Tx,
    pub token_entries: Vec<TokenEntryTemplate<'a>>,
    pub confirmations: i32,
    pub timestamp: DateTime<Utc>,
    pub sats_input: i64,
    pub sats_output: i64,
    pub token_icon_url: &'a str,
    pub network_selector: bool,
    pub hashes: FileHashes,
}

pub struct TokenEntryTemplate<'a> {
    pub token_hex: String,
    pub token_section_title: String,
    pub entry: &'a TokenEntry,
    pub genesis_info: Option<GenesisInfo>,
    pub token_input: i128,
    pub token_output: i128,
    pub action_str: &'a str,
    pub specification: &'a str,
    pub token_type: &'a str,
}

#[derive(Template)]
#[template(path = "pages/address.html")]
pub struct AddressTemplate<'a> {
    pub tokens: HashMap<String, TokenInfo>,
    pub token_dust: i64,
    pub total_xec: i64,
    pub address_num_txs: u32,
    pub address: &'a str,
    pub sats_address: &'a str,
    pub token_address: &'a str,
    pub legacy_address: String,
    pub json_balances: HashMap<String, JsonBalance>,
    pub encoded_tokens: String,
    pub encoded_balances: String,
    pub token_icon_url: &'a str,
    pub network_selector: bool,
    pub hashes: FileHashes,
}

#[derive(Template)]
#[template(path = "pages/mempool.html")]
pub struct MempoolTemplate {
    pub num_txs: u32,
    pub total_size: u64,
    pub num_finalized_txs: u64,
    pub total_finalized_size: u64,
    pub network_selector: bool,
    pub hashes: FileHashes,
}

#[derive(Template)]
#[template(path = "pages/token.html")]
pub struct TokenTemplate<'a> {
    pub token: TokenInfo,
    pub token_type_str: String,
    pub specification: String,
    pub token_icon_url: &'a str,
    pub num_txs: u32,
    pub network_selector: bool,
    pub hashes: FileHashes,
}

#[derive(Template)]
#[template(path = "pages/testnet-faucet.html")]
pub struct TestnetFaucetTemplate {
    pub network_selector: bool,
    pub hashes: FileHashes,
}

#[derive(Template)]
#[template(path = "pages/error.html")]
pub struct ErrorTemplate {
    pub message: String,
    pub network_selector: bool,
    pub hashes: FileHashes,
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use askama::Template;

    use crate::{file_hashes::FileHashes, templating::AddressTemplate};

    /// A minimal AddressTemplate that renders the token section
    /// (token_dust > 0) without needing token/balance fixtures: the Tokens
    /// toggle and its container render outside the json_balances loop.
    fn address_template(token_dust: i64) -> AddressTemplate<'static> {
        AddressTemplate {
            tokens: HashMap::new(),
            token_dust,
            total_xec: 0,
            address_num_txs: 0,
            address: "",
            sats_address: "",
            token_address: "",
            legacy_address: String::new(),
            json_balances: HashMap::new(),
            encoded_tokens: "{}".to_string(),
            encoded_balances: "{}".to_string(),
            token_icon_url: "",
            network_selector: false,
            hashes: FileHashes::default(),
        }
    }

    #[test]
    fn token_list_is_collapsed_by_default() {
        let html = address_template(1).render().unwrap();

        // The token section renders when there is token dust
        assert!(html.contains("etoken-table-ctn"));

        // Its container is hidden by default, like the XEC "Coins" section, so
        // the user expands the token list on demand instead of it defaulting
        // open
        assert!(html.contains(
            r#"<div class="etoken-table-ctn" style="display: none">"#
        ));

        // The Tokens toggle chevron is not pre-rotated. rotate-arrow is
        // added on click. base.html's script also contains that class name,
        // so check this toggle instead of the whole page.
        let onclick = "$('.etoken-table-ctn').toggle(); rotateArrow(this);";
        let start = html.find(onclick).unwrap();
        let end = start + html[start..].find("</a>").unwrap();
        let toggle = &html[start..end];
        assert!(toggle.contains("Tokens"));
        assert!(toggle.contains(r#"class="icon chevron circle down""#));
        assert!(!toggle.contains("rotate-arrow"));
    }
}
