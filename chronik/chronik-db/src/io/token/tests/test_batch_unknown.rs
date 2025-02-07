// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::script::Script;
use bitcoinsuite_slp::{
    alp::sections_opreturn, slp::genesis_opreturn, structs::GenesisInfo,
    token_type::SlpTokenType::*,
};
use pretty_assertions::assert_eq;

use crate::io::token::{
    tests::mock::{db_atoms, make_tx, MockTokenDb},
    DbToken::{NoToken, UnknownAlp, UnknownSlp},
    DbTokenTx, TokenReader,
};

#[test]
fn test_batch_unknown() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;
    let token_reader = TokenReader::new(&db)?;

    let block0 = [
        make_tx(0, [(0xff, 0)], 1, Script::default()),
        make_tx(
            1,
            [],
            2,
            genesis_opreturn(&GenesisInfo::empty_slp(), Fungible, None, 1000),
        ),
    ];
    mock_db.connect(&block0)?;
    // Unknown token types
    let block1 = [
        make_tx(2, [(0xff, 0)], 1, Script::default()),
        // Unknown ALP outputs
        make_tx(
            3,
            [(1, 1)],
            2,
            sections_opreturn(vec![b"SLP2\x22".as_ref().into()]),
        ),
        // Unknown SLP outputs
        make_tx(
            4,
            [],
            2,
            Script::new(b"\x6a\x04SLP\0\x01\x44\x01\x01".as_ref().into()),
        ),
        // Unknown ALP/SLP inputs from the same batch
        make_tx(5, [(3, 1), (4, 1)], 1, Script::default()),
    ];
    mock_db.connect(&block1)?;
    assert_eq!(
        token_reader.token_tx(3)?,
        Some(DbTokenTx {
            token_tx_nums: vec![1],
            inputs: vec![db_atoms::<0>(1000)],
            outputs: vec![NoToken, UnknownAlp(0x22), UnknownAlp(0x22)],
            ..Default::default()
        }),
    );
    assert_eq!(
        token_reader.token_tx(4)?,
        Some(DbTokenTx {
            token_tx_nums: vec![],
            inputs: vec![],
            outputs: vec![NoToken, UnknownSlp(0x44), UnknownSlp(0x44)],
            ..Default::default()
        }),
    );
    assert_eq!(
        token_reader.token_tx(5)?,
        Some(DbTokenTx {
            token_tx_nums: vec![],
            inputs: vec![UnknownAlp(0x22), UnknownSlp(0x44)],
            outputs: vec![NoToken, NoToken],
            ..Default::default()
        }),
    );

    let block2 = [
        make_tx(6, [(0xff, 0)], 1, Script::default()),
        // Unknown ALP/SLP inputs from the DB
        make_tx(7, [(3, 2), (4, 2)], 1, Script::default()),
    ];
    mock_db.connect(&block2)?;
    assert_eq!(
        token_reader.token_tx(7)?,
        Some(DbTokenTx {
            token_tx_nums: vec![],
            inputs: vec![UnknownAlp(0x22), UnknownSlp(0x44)],
            outputs: vec![NoToken, NoToken],
            ..Default::default()
        }),
    );

    mock_db.disconnect(&block2)?;
    mock_db.disconnect(&block1)?;
    mock_db.disconnect(&block0)?;

    Ok(())
}
