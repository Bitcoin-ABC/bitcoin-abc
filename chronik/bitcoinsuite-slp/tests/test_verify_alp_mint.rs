// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_slp::{
    alp::sections_opreturn,
    structs::TxType,
    test_helpers::{
        alp_mint, empty_entry, meta_alp as meta, spent_baton, token_atoms,
        token_baton, verify, TOKEN_ID2, TOKEN_ID3, TOKEN_ID4, TOKEN_ID5,
    },
    token_tx::{TokenTx, TokenTxEntry},
    verify::BurnError,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_alp_no_mint_baton() {
    assert_eq!(
        verify::<2>(
            sections_opreturn(vec![alp_mint(&TOKEN_ID2, [100], 1)]),
            &[],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::MINT),
                is_invalid: true,
                burn_error: Some(BurnError::MissingMintBaton),
                ..empty_entry()
            }],
            outputs: vec![None, None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_wrong_mint_baton_token_id() {
    assert_eq!(
        verify::<2>(
            sections_opreturn(vec![alp_mint(&TOKEN_ID2, [100], 1)]),
            &[spent_baton(meta(TOKEN_ID3))],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID2),
                    tx_type: Some(TxType::MINT),
                    is_invalid: true,
                    burn_error: Some(BurnError::MissingMintBaton),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID3),
                    tx_type: None,
                    is_invalid: true,
                    burns_mint_batons: true,
                    ..empty_entry()
                },
            ],
            outputs: vec![None, None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_success_simple() {
    assert_eq!(
        verify::<2>(
            sections_opreturn(vec![alp_mint(&TOKEN_ID2, [100], 1)]),
            &[spent_baton(meta(TOKEN_ID2))],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::MINT),
                ..empty_entry()
            }],
            outputs: vec![None, token_atoms::<0>(100), token_baton::<0>()],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_success_big() {
    assert_eq!(
        verify::<6>(
            sections_opreturn(vec![
                alp_mint(&TOKEN_ID2, [100, 0], 1),
                alp_mint(&TOKEN_ID3, [0, 15, 0], 1),
                alp_mint(&TOKEN_ID4, [0, 0, 0, 0, 2], 1),
            ]),
            &[
                spent_baton(meta(TOKEN_ID2)),
                spent_baton(meta(TOKEN_ID3)),
                spent_baton(meta(TOKEN_ID5)),
            ],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID2),
                    tx_type: Some(TxType::MINT),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID3),
                    tx_type: Some(TxType::MINT),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID4),
                    tx_type: Some(TxType::MINT),
                    is_invalid: true,
                    burn_error: Some(BurnError::MissingMintBaton),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID5),
                    tx_type: None,
                    is_invalid: true,
                    burns_mint_batons: true,
                    ..empty_entry()
                },
            ],
            outputs: vec![
                None,
                token_atoms::<0>(100),
                token_atoms::<1>(15),
                token_baton::<0>(),
                token_baton::<1>(),
                None,
                None,
            ],
            failed_parsings: vec![],
        },
    );
}
