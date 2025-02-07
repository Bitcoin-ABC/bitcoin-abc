// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::script::Script;
use bitcoinsuite_slp::{
    alp::{genesis_section, mint_section, sections_opreturn, send_section},
    parsed::ParsedMintData,
    structs::GenesisInfo,
    test_helpers::meta_alp,
    token_type::AlpTokenType::*,
};
use pretty_assertions::assert_eq;

use crate::io::token::{
    tests::mock::{db_atoms, db_baton, make_tx, token_id, MockTokenDb},
    DbToken::NoToken,
    DbTokenTx, TokenReader,
};

#[test]
fn test_batch_alp() -> Result<()> {
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
    mock_db.connect(&[
        make_tx(0, [(0xff, 0)], 1, Script::default()),
        // GENESIS ALP
        make_tx(
            1,
            [],
            5,
            sections_opreturn(vec![genesis_section(
                Standard,
                &genesis_info,
                &ParsedMintData {
                    atoms_vec: vec![1, 0, 3],
                    num_batons: 2,
                },
            )]),
        ),
        // MINT ALP in the same batch
        make_tx(
            2,
            [(1, 4)],
            5,
            sections_opreturn(vec![mint_section(
                &token_id(1),
                Standard,
                &ParsedMintData {
                    atoms_vec: vec![4, 0, 0, 5],
                    num_batons: 1,
                },
            )]),
        ),
        // SEND ALP in the same batch
        make_tx(
            3,
            [(1, 3), (2, 1)],
            3,
            sections_opreturn(vec![send_section(
                &token_id(1),
                Standard,
                [1, 0, 6],
            )]),
        ),
    ])?;
    // GENESIS ALP
    assert_eq!(
        token_reader.token_tx(1)?,
        Some(DbTokenTx {
            token_tx_nums: vec![1],
            inputs: vec![],
            outputs: vec![
                NoToken,
                db_atoms::<0>(1),
                NoToken,
                db_atoms::<0>(3),
                db_baton::<0>(),
                db_baton::<0>(),
            ],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.genesis_info(1)?, Some(genesis_info));
    assert_eq!(token_reader.token_meta(1)?, Some(meta_alp(token_id(1))));
    // MINT ALP
    assert_eq!(
        token_reader.token_tx(2)?,
        Some(DbTokenTx {
            token_tx_nums: vec![1],
            inputs: vec![db_baton::<0>()],
            outputs: vec![
                NoToken,
                db_atoms::<0>(4),
                NoToken,
                NoToken,
                db_atoms::<0>(5),
                db_baton::<0>(),
            ],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.genesis_info(2)?, None);
    assert_eq!(token_reader.token_meta(2)?, None);
    // SEND ALP
    assert_eq!(
        token_reader.token_tx(3)?,
        Some(DbTokenTx {
            token_tx_nums: vec![1],
            inputs: vec![db_atoms::<0>(3), db_atoms::<0>(4)],
            outputs: vec![
                NoToken, // Add empty comment for linter
                db_atoms::<0>(1),
                NoToken,
                db_atoms::<0>(6),
            ],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.genesis_info(3)?, None);
    assert_eq!(token_reader.token_meta(3)?, None);

    mock_db.connect(&[
        make_tx(4, [(0xff, 0)], 1, Script::default()),
        // another GENESIS ALP + a MINT of token 1
        make_tx(
            5,
            [(2, 5), (1, 1)],
            5,
            sections_opreturn(vec![
                genesis_section(
                    Standard,
                    &GenesisInfo::default(),
                    &ParsedMintData {
                        atoms_vec: vec![100, 0, 200],
                        num_batons: 1,
                    },
                ),
                mint_section(
                    &token_id(1),
                    Standard,
                    &ParsedMintData {
                        atoms_vec: vec![0, 4, 0, 0],
                        num_batons: 1,
                    },
                ),
            ]),
        ),
    ])?;
    // GENESIS + MINT
    assert_eq!(
        token_reader.token_tx(5)?,
        Some(DbTokenTx {
            token_tx_nums: vec![5, 1],
            inputs: vec![db_baton::<1>(), db_atoms::<1>(1)],
            outputs: vec![
                NoToken,
                db_atoms::<0>(100),
                db_atoms::<1>(4),
                db_atoms::<0>(200),
                db_baton::<0>(),
                db_baton::<1>(),
            ],
            ..Default::default()
        }),
    );
    assert_eq!(
        token_reader.genesis_info(5)?,
        Some(GenesisInfo::empty_alp()),
    );
    assert_eq!(token_reader.token_meta(5)?, Some(meta_alp(token_id(5))));

    Ok(())
}
