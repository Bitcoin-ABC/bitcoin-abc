// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::script::Script;
use bitcoinsuite_slp::{
    alp,
    color::{FailedParsing, ParseError},
    slp::{self, send_opreturn},
    structs::TxType,
    test_helpers::{
        empty_entry, meta_slp as meta, spent_atoms, token_atoms, verify,
        TOKEN_ID2,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::SlpTokenType::*,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_slp_parse_error() {
    assert_eq!(
        verify::<1>(Script::new(b"\x6a\x04SLP2".as_ref().into()), &[],),
        TokenTx {
            entries: vec![],
            outputs: vec![None, None],
            failed_parsings: vec![FailedParsing {
                pushdata_idx: None,
                bytes: b"\x6a\x04SLP2".as_ref().into(),
                error: ParseError::Slp(slp::ParseError::InvalidAlpLokadId),
            }],
        },
    );
}

#[test]
fn test_verify_slp_more_than_32767_inputs() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        // More than 32767 inputs allowed in SLP
        let spent_tokens =
            vec![
                spent_atoms(meta(TOKEN_ID2, token_type), u64::MAX);
                alp::consts::MAX_TX_INPUTS + 1
            ];
        assert_eq!(
            verify::<1>(
                send_opreturn(&TOKEN_ID2, token_type, &[u64::MAX]),
                &spent_tokens,
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::SEND),
                    actual_burn_atoms: 32767 * u64::MAX as u128,
                    ..empty_entry()
                }],
                outputs: vec![None, token_atoms::<0>(u64::MAX)],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_slp_colored_out_of_range() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(
                send_opreturn(&TOKEN_ID2, token_type, &[100, 200, 300]),
                &[spent_atoms(meta(TOKEN_ID2, token_type), 600)],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::SEND),
                    actual_burn_atoms: 500,
                    has_colored_out_of_range: true,
                    ..empty_entry()
                }],
                outputs: vec![None, token_atoms::<0>(100)],
                failed_parsings: vec![],
            },
        );
    }
}
