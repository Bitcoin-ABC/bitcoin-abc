// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_chronik_client::proto::{GenesisInfo, TokenInfo};

const FIRMA_TOKEN_ID: &str =
    "0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0";

pub fn apply_genesis_display_overrides(
    token_id: &str,
    genesis_info: GenesisInfo,
) -> GenesisInfo {
    if !token_id.eq_ignore_ascii_case(FIRMA_TOKEN_ID) {
        return genesis_info;
    }

    GenesisInfo {
        token_name: b"Firma Alpha".to_vec(),
        token_ticker: b"FIRMA ALPHA".to_vec(),
        url: b"firmaprotocol.com".to_vec(),
        ..genesis_info
    }
}

pub fn apply_token_display_overrides(mut token: TokenInfo) -> TokenInfo {
    if let Some(genesis_info) = token.genesis_info.take() {
        token.genesis_info = Some(apply_genesis_display_overrides(
            &token.token_id,
            genesis_info,
        ));
    }
    token
}
