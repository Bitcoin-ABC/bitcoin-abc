// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_slp::{
    alp::{genesis_section, sections_opreturn},
    parsed::ParsedMintData,
    structs::{GenesisInfo, TxType},
    test_helpers::{
        empty_entry, meta_alp as meta, spent_atoms, token_atoms, token_baton,
        verify, TOKEN_ID1, TOKEN_ID2, TOKEN_ID3,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::AlpTokenType::*,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_alp_genesis() {
    let genesis_info = GenesisInfo {
        token_ticker: b"ALP".as_ref().into(),
        token_name: b"ALP Token".as_ref().into(),
        mint_vault_scripthash: None,
        url: b"http::example.alp".as_ref().into(),
        hash: None,
        data: Some(b"ALP Data".as_ref().into()),
        auth_pubkey: Some(b"ALP Pubkey".as_ref().into()),
        decimals: 4,
    };
    assert_eq!(
        verify::<5>(
            sections_opreturn(vec![genesis_section(
                Standard,
                &genesis_info,
                &ParsedMintData {
                    atoms_vec: vec![200, 0, 300],
                    num_batons: 2,
                },
            )]),
            &[],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID1),
                tx_type: Some(TxType::GENESIS),
                genesis_info: Some(genesis_info),
                ..empty_entry()
            }],
            outputs: vec![
                None,
                token_atoms::<0>(200),
                None,
                token_atoms::<0>(300),
                token_baton::<0>(),
                token_baton::<0>(),
            ],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_genesis_with_burn() {
    assert_eq!(
        verify::<5>(
            sections_opreturn(vec![genesis_section(
                Standard,
                &GenesisInfo::empty_alp(),
                &ParsedMintData {
                    atoms_vec: vec![200, 0, 300],
                    num_batons: 2,
                },
            )]),
            &[
                spent_atoms(meta(TOKEN_ID2), 100),
                spent_atoms(meta(TOKEN_ID3), 2000),
            ],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID1),
                    tx_type: Some(TxType::GENESIS),
                    genesis_info: Some(GenesisInfo::empty_alp()),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID2),
                    is_invalid: true,
                    actual_burn_atoms: 100,
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID3),
                    is_invalid: true,
                    actual_burn_atoms: 2000,
                    ..empty_entry()
                },
            ],
            outputs: vec![
                None,
                token_atoms::<0>(200),
                None,
                token_atoms::<0>(300),
                token_baton::<0>(),
                token_baton::<0>(),
            ],
            failed_parsings: vec![],
        },
    );
}
