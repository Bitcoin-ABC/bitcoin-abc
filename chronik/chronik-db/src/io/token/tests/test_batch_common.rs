// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::script::Script;
use bitcoinsuite_slp::{
    alp::{genesis_section, sections_opreturn},
    parsed::ParsedMintData,
    slp::{genesis_opreturn, send_opreturn},
    structs::GenesisInfo,
    test_helpers::meta_slp,
    token_type::{AlpTokenType::*, SlpTokenType::*},
};
use pretty_assertions::assert_eq;

use crate::io::token::{
    tests::mock::{db_atoms, db_baton, make_tx, token_id, MockTokenDb},
    BatchError,
    DbToken::NoToken,
    DbTokenTx, TokenReader,
};

#[test]
fn test_batch_skip_validation() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;
    let token_reader = TokenReader::new(&db)?;

    // No token txs, and no tokens in the DB -> skipped validation
    let block0 = [
        make_tx(0, [(0xff, 0)], 4, Script::EMPTY),
        make_tx(1, [(0, 1)], 3, Script::EMPTY),
        make_tx(2, [(0, 2)], 3, Script::EMPTY),
    ];
    let processed = mock_db.connect(&block0)?;
    assert!(!processed.did_validation);

    // Empty SLP GENESIS -> does validation
    let processed = mock_db.connect(&[
        make_tx(3, [(0xff, 0)], 4, Script::EMPTY),
        make_tx(
            4,
            [(1, 1)],
            2,
            genesis_opreturn(&GenesisInfo::empty_slp(), Fungible, None, 0),
        ),
    ])?;
    assert!(processed.did_validation);
    assert_eq!(
        token_reader.token_tx(4)?,
        Some(DbTokenTx {
            token_tx_nums: vec![4],
            inputs: vec![NoToken],
            outputs: vec![NoToken, NoToken, NoToken],
            ..Default::default()
        }),
    );

    // Empty ALP GENESIS -> does validation
    let processed = mock_db.connect(&[
        make_tx(5, [(0xff, 0)], 4, Script::EMPTY),
        make_tx(
            6,
            [(1, 2)],
            2,
            sections_opreturn(vec![genesis_section(
                Standard,
                &GenesisInfo::default(),
                &ParsedMintData::default(),
            )]),
        ),
    ])?;
    assert!(processed.did_validation);
    assert_eq!(
        token_reader.token_tx(6)?,
        Some(DbTokenTx {
            token_tx_nums: vec![6],
            inputs: vec![NoToken],
            outputs: vec![NoToken, NoToken, NoToken],
            ..Default::default()
        }),
    );

    Ok(())
}

#[test]
fn test_batch_cycle() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;

    // Cycle invalid, GENESIS depends on SEND of its own token
    // (can't happen in practice, but better test for it)
    let result = mock_db.connect(&[
        make_tx(3, [(0xff, 0)], 2, Script::EMPTY),
        make_tx(
            4,
            [(5, 0)],
            1,
            genesis_opreturn(&GenesisInfo::default(), Fungible, None, 0),
        ),
        make_tx(5, [(4, 0)], 1, send_opreturn(&token_id(4), Fungible, &[20])),
    ]);
    assert_eq!(
        result.unwrap_err().downcast::<BatchError>()?,
        BatchError::Cycle,
    );

    Ok(())
}

#[test]
fn test_batch_topological_sort() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;
    let token_reader = TokenReader::new(&db)?;

    let genesis_info = GenesisInfo {
        token_ticker: b"SLP FUNGIBLE".as_ref().into(),
        token_name: b"Fungible ".as_ref().into(),
        mint_vault_scripthash: None,
        url: b"".as_ref().into(),
        hash: Some([4; 32]),
        data: None,
        auth_pubkey: None,
        decimals: 4,
    };
    // Valid: GENESIS SLP token and use it in the same batch; but txs aren't
    // ordered topologically.
    let processed = mock_db.connect(&[
        make_tx(0, [(0xff, 0)], 2, Script::EMPTY),
        // 4th tx: Non-token tx burns tokens
        make_tx(1, [(3, 1)], 2, Script::default()),
        // 2nd tx: SEND tokens from GENESIS
        make_tx(
            2,
            [(4, 1)],
            1,
            send_opreturn(&token_id(4), Fungible, &[400]),
        ),
        // 3rd tx: SEND tokens again
        make_tx(
            3,
            [(2, 1)],
            2,
            send_opreturn(&token_id(4), Fungible, &[300, 100]),
        ),
        // 1st tx: GENESIS SLP token
        make_tx(
            4,
            [],
            2,
            genesis_opreturn(&genesis_info, Fungible, Some(2), 1000),
        ),
    ])?;
    assert!(processed.did_validation);

    // GENESIS SLP
    assert_eq!(
        token_reader.token_tx(4)?,
        Some(DbTokenTx {
            token_tx_nums: vec![4],
            inputs: vec![],
            outputs: vec![NoToken, db_atoms::<0>(1000), db_baton::<0>()],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.genesis_info(4)?, Some(genesis_info));
    assert_eq!(
        token_reader.token_meta(4)?,
        Some(meta_slp(token_id(4), Fungible)),
    );
    // SEND from GENESIS
    assert_eq!(
        token_reader.token_tx(2)?,
        Some(DbTokenTx {
            token_tx_nums: vec![4],
            inputs: vec![db_atoms::<0>(1000)],
            outputs: vec![NoToken, db_atoms::<0>(400)],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.genesis_info(2)?, None);
    assert_eq!(token_reader.token_meta(2)?, None);
    // SEND again
    assert_eq!(
        token_reader.token_tx(3)?,
        Some(DbTokenTx {
            token_tx_nums: vec![4],
            inputs: vec![db_atoms::<0>(400)],
            outputs: vec![NoToken, db_atoms::<0>(300), db_atoms::<0>(100),],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.genesis_info(3)?, None);
    assert_eq!(token_reader.token_meta(3)?, None);
    // Non-token tx burns the tokens
    assert_eq!(
        token_reader.token_tx(1)?,
        Some(DbTokenTx {
            token_tx_nums: vec![4],
            inputs: vec![db_atoms::<0>(300)],
            outputs: vec![NoToken, NoToken, NoToken],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.genesis_info(1)?, None);
    assert_eq!(token_reader.token_meta(1)?, None);

    Ok(())
}
