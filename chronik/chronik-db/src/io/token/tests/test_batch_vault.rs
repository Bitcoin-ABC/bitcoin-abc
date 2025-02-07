// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::{hash::ShaRmd160, script::Script};
use bitcoinsuite_slp::{
    slp::{genesis_opreturn, mint_vault_opreturn, send_opreturn},
    structs::GenesisInfo,
    test_helpers::meta_slp,
    token_type::SlpTokenType::*,
};
use pretty_assertions::assert_eq;

use crate::io::token::{
    tests::mock::{
        db_atoms, make_tx, make_tx_with_scripts, token_id, MockTokenDb,
    },
    DbToken::NoToken,
    DbTokenTx, TokenReader, FLAGS_HAS_MINT_VAULT,
};

#[test]
fn test_batch_vault() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;
    let token_reader = TokenReader::new(&db)?;

    let vault_scripthash = ShaRmd160([0x44; 20]);
    let vault_genesis_info = GenesisInfo {
        token_ticker: b"SLP VAULT".as_ref().into(),
        token_name: b"Fungible ".as_ref().into(),
        mint_vault_scripthash: Some(vault_scripthash),
        ..Default::default()
    };
    mock_db.connect(&[
        make_tx(0, [(0xff, 0)], 3, Script::default()),
        // Invalid: MINT SLP V2 in the same block (GENESIS depends on this
        // MINT)
        make_tx_with_scripts(
            1,
            [(0, 0, Script::p2sh(&vault_scripthash))],
            2,
            mint_vault_opreturn(&token_id(2), [3000, 4000]),
        ),
        // GENESIS SLP V2 Mint Vault
        make_tx(
            2,
            [(1, 0)],
            1,
            genesis_opreturn(&vault_genesis_info, MintVault, None, 2000),
        ),
        // Invalid: MINT SLP V2 in the same block
        make_tx_with_scripts(
            3,
            [(1, 1, Script::p2sh(&vault_scripthash))],
            2,
            mint_vault_opreturn(&token_id(2), [3000, 4000]),
        ),
    ])?;
    assert_eq!(token_reader.token_tx(1)?, None);
    assert_eq!(token_reader.genesis_info(1)?, None);
    assert_eq!(token_reader.token_meta(1)?, None);

    assert_eq!(
        token_reader.token_tx(2)?,
        Some(DbTokenTx {
            token_tx_nums: vec![2],
            inputs: vec![NoToken],
            outputs: vec![NoToken, db_atoms::<0>(2000)],
            ..Default::default()
        }),
    );
    assert_eq!(
        token_reader.token_meta(2)?,
        Some(meta_slp(token_id(2), MintVault)),
    );
    assert_eq!(token_reader.genesis_info(2)?, Some(vault_genesis_info));

    assert_eq!(token_reader.token_tx(3)?, None);
    assert_eq!(token_reader.genesis_info(3)?, None);
    assert_eq!(token_reader.token_meta(3)?, None);

    mock_db.connect(&[
        make_tx(4, [(0xff, 0)], 1, Script::default()),
        // MINT SLP V2 (valid: is from another block)
        make_tx_with_scripts(
            5,
            [(0, 2, Script::p2sh(&vault_scripthash))],
            2,
            mint_vault_opreturn(&token_id(2), [3000, 4000]),
        ),
        // Invalid MINT SLP V2 without valid mint vault
        make_tx(6, [(0, 2)], 1, mint_vault_opreturn(&token_id(2), [7777])),
        // Use both DB token in SLP SEND and token from this batch
        make_tx(
            7,
            [(2, 1), (5, 1)],
            2,
            send_opreturn(&token_id(2), MintVault, &[4500, 500]),
        ),
    ])?;
    assert_eq!(
        token_reader.token_tx(5)?,
        Some(DbTokenTx {
            token_tx_nums: vec![2],
            inputs: vec![NoToken],
            outputs: vec![NoToken, db_atoms::<0>(3000), db_atoms::<0>(4000)],
            flags: FLAGS_HAS_MINT_VAULT,
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.token_tx(6)?, None);
    assert_eq!(
        token_reader.token_tx(7)?,
        Some(DbTokenTx {
            token_tx_nums: vec![2],
            inputs: vec![db_atoms::<0>(2000), db_atoms::<0>(3000)],
            outputs: vec![NoToken, db_atoms::<0>(4500), db_atoms::<0>(500)],
            flags: 0,
            ..Default::default()
        }),
    );

    Ok(())
}
