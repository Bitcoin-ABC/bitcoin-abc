// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    hash::ShaRmd160,
    script::Script,
    tx::{Tx, TxMut, TxOutput},
};
use bitcoinsuite_slp::{
    color::ColoredTx,
    slp::mint_vault_opreturn,
    structs::{GenesisInfo, TxType},
    test_helpers::{
        empty_entry, meta_alp, meta_slp as meta, spent_atoms, spent_baton,
        token_atoms, TOKEN_ID2, TOKEN_ID3, TOKEN_ID4, TXID,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::SlpTokenType::*,
    verify::{BurnError, SpentToken, VerifyContext},
};
use pretty_assertions::assert_eq;

fn verify<const N: usize>(
    script: Script,
    spent_tokens: &[Option<SpentToken>],
    spent_scripts: &[Script],
    mint_vault_scripthash: Option<ShaRmd160>,
) -> TokenTx {
    let tx = Tx::with_txid(
        TXID,
        TxMut {
            outputs: [
                [TxOutput { sats: 0, script }].as_ref(),
                &vec![TxOutput::default(); N],
            ]
            .concat(),
            ..Default::default()
        },
    );
    let colored_tx = ColoredTx::color_tx(&tx).unwrap();
    let genesis_info = GenesisInfo {
        mint_vault_scripthash,
        ..Default::default()
    };
    let context = VerifyContext {
        spent_tokens,
        spent_scripts: Some(spent_scripts),
        genesis_info: Some(&genesis_info),
        override_has_mint_vault: None,
    };
    context.verify(colored_tx)
}

#[test]
fn test_verify_mint_vault_no_genesis_no_scripts() {
    assert_eq!(
        verify::<1>(mint_vault_opreturn(&TOKEN_ID2, [77]), &[], &[], None),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2, MintVault),
                tx_type: Some(TxType::MINT),
                is_invalid: true,
                burn_error: Some(BurnError::MissingMintVault),
                ..empty_entry()
            }],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_mint_vault_no_scritps() {
    assert_eq!(
        verify::<1>(
            mint_vault_opreturn(&TOKEN_ID2, [77]),
            &[],
            &[],
            Some(ShaRmd160([1; 20])),
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2, MintVault),
                tx_type: Some(TxType::MINT),
                is_invalid: true,
                burn_error: Some(BurnError::MissingMintVault),
                ..empty_entry()
            }],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_mint_vault_missing_vault_script() {
    assert_eq!(
        verify::<1>(
            mint_vault_opreturn(&TOKEN_ID2, [77]),
            &[],
            &[
                Script::p2sh(&ShaRmd160([0; 20])),
                Script::p2sh(&ShaRmd160([1; 20])),
                Script::p2sh(&ShaRmd160([3; 20])),
            ],
            Some(ShaRmd160([2; 20])),
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2, MintVault),
                tx_type: Some(TxType::MINT),
                is_invalid: true,
                burn_error: Some(BurnError::MissingMintVault),
                ..empty_entry()
            },],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_mint_vault_success_simple() {
    assert_eq!(
        verify::<3>(
            mint_vault_opreturn(&TOKEN_ID2, [30, 0, 50]),
            &[],
            &[Script::p2sh(&ShaRmd160([1; 20]))],
            Some(ShaRmd160([1; 20])),
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2, MintVault),
                tx_type: Some(TxType::MINT),
                ..empty_entry()
            }],
            outputs: vec![
                None,
                token_atoms::<0>(30),
                None,
                token_atoms::<0>(50),
            ],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_mint_vault_success_multiple_scripts() {
    assert_eq!(
        verify::<3>(
            mint_vault_opreturn(&TOKEN_ID2, [30, 0, 50]),
            &[],
            &[
                Script::p2sh(&ShaRmd160([0; 20])),
                Script::p2sh(&ShaRmd160([1; 20])),
                Script::p2sh(&ShaRmd160([2; 20])),
            ],
            Some(ShaRmd160([1; 20])),
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2, MintVault),
                tx_type: Some(TxType::MINT),
                ..empty_entry()
            }],
            outputs: vec![
                None,
                token_atoms::<0>(30),
                None,
                token_atoms::<0>(50),
            ],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_mint_vault_success_with_burns() {
    assert_eq!(
        verify::<3>(
            mint_vault_opreturn(&TOKEN_ID2, [10, 0, 20]),
            &[
                spent_atoms(meta(TOKEN_ID2, MintVault), 80),
                spent_baton(meta(TOKEN_ID3, Fungible)),
                spent_atoms(meta(TOKEN_ID3, Fungible), 800),
                spent_baton(meta_alp(TOKEN_ID4)),
            ],
            &[
                Script::p2sh(&ShaRmd160([0; 20])),
                Script::p2sh(&ShaRmd160([1; 20])),
                Script::p2sh(&ShaRmd160([2; 20])),
            ],
            Some(ShaRmd160([1; 20])),
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID2, MintVault),
                    tx_type: Some(TxType::MINT),
                    actual_burn_atoms: 80,
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID3, Fungible),
                    tx_type: None,
                    is_invalid: true,
                    actual_burn_atoms: 800,
                    burns_mint_batons: true,
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta_alp(TOKEN_ID4),
                    tx_type: None,
                    is_invalid: true,
                    burns_mint_batons: true,
                    ..empty_entry()
                },
            ],
            outputs: vec![
                None,
                token_atoms::<0>(10),
                None,
                token_atoms::<0>(20),
            ],
            failed_parsings: vec![],
        },
    );
}
