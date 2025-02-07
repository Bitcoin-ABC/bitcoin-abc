// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::script::Script;
use bitcoinsuite_slp::{
    alp::{genesis_section, sections_opreturn},
    parsed::ParsedMintData,
    slp::genesis_opreturn,
    structs::GenesisInfo,
    test_helpers::{meta_alp, meta_slp},
    token_type::{AlpTokenType::*, SlpTokenType::*},
};
use pretty_assertions::assert_eq;

use crate::io::token::{
    tests::mock::{db_atoms, db_baton, make_tx, token_id, MockTokenDb},
    DbToken::NoToken,
    DbTokenTx, TokenReader,
};

#[test]
fn test_batch_genesis_slp_fungible() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;
    let token_reader = TokenReader::new(&db)?;

    let genesis_info = GenesisInfo {
        token_ticker: b"SLP FUNGIBLE".as_ref().into(),
        token_name: b"Fungible".as_ref().into(),
        mint_vault_scripthash: None,
        url: b"https://example.com".as_ref().into(),
        hash: Some([4; 32]),
        data: None,
        auth_pubkey: None,
        decimals: 4,
    };
    mock_db.connect(&[
        make_tx(0, [(0xff, 0)], 4, Script::EMPTY),
        make_tx(
            1,
            [],
            3,
            genesis_opreturn(&genesis_info, Fungible, Some(3), 1000),
        ),
    ])?;
    assert_eq!(
        token_reader.token_tx(1)?,
        Some(DbTokenTx {
            token_tx_nums: vec![1],
            inputs: vec![],
            outputs: vec![
                NoToken,
                db_atoms::<0>(1000),
                NoToken,
                db_baton::<0>(),
            ],
            ..Default::default()
        }),
    );
    assert_eq!(
        token_reader.token_meta(1)?,
        Some(meta_slp(token_id(1), Fungible)),
    );
    assert_eq!(token_reader.genesis_info(1)?, Some(genesis_info));
    Ok(())
}

#[test]
fn test_batch_genesis_alp() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;
    let token_reader = TokenReader::new(&db)?;

    let genesis_info = GenesisInfo {
        token_ticker: b"ALP STD".as_ref().into(),
        token_name: b"ALP Standard".as_ref().into(),
        mint_vault_scripthash: None,
        url: b"https://example.com".as_ref().into(),
        hash: None,
        data: Some(b"data".as_ref().into()),
        auth_pubkey: Some(b"auth_pubkey".as_ref().into()),
        decimals: 4,
    };
    let processed = mock_db.connect(&[
        make_tx(0, [(0xff, 0)], 4, Script::EMPTY),
        make_tx(
            1,
            [],
            5,
            sections_opreturn(vec![genesis_section(
                Standard,
                &genesis_info,
                &ParsedMintData {
                    atoms_vec: vec![100, 0, 200],
                    num_batons: 2,
                },
            )]),
        ),
    ])?;
    assert!(processed.did_validation);
    assert_eq!(
        token_reader.token_tx(1)?,
        Some(DbTokenTx {
            token_tx_nums: vec![1],
            inputs: vec![],
            outputs: vec![
                NoToken,
                db_atoms::<0>(100),
                NoToken,
                db_atoms::<0>(200),
                db_baton::<0>(),
                db_baton::<0>(),
            ],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.token_meta(1)?, Some(meta_alp(token_id(1))));
    assert_eq!(token_reader.genesis_info(1)?, Some(genesis_info));

    Ok(())
}
