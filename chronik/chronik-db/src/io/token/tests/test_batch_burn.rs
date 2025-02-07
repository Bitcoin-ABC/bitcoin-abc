// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::script::Script;
use bitcoinsuite_slp::{
    alp::{burn_section, genesis_section, sections_opreturn},
    parsed::ParsedMintData,
    slp::{burn_opreturn, genesis_opreturn},
    structs::GenesisInfo,
    token_type::{AlpTokenType::*, SlpTokenType::*},
};
use pretty_assertions::assert_eq;

use crate::io::token::{
    tests::mock::{db_atoms, make_tx, token_id, MockTokenDb},
    DbToken::NoToken,
    DbTokenTx, TokenReader,
};

#[test]
fn test_batch_burn() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;
    let token_reader = TokenReader::new(&db)?;

    mock_db.connect(&[
        make_tx(0, [(0xff, 0)], 1, Script::default()),
        // Empty SLP BURN with no inputs (not recorded in DB at all)
        make_tx(1, [], 0, burn_opreturn(&token_id(3), Fungible, 20)),
        // Empty ALP BURN with no inputs (not recorded in DB at all)
        make_tx(
            2,
            [],
            0,
            sections_opreturn(vec![burn_section(&token_id(4), Standard, 20)]),
        ),
        // GENESIS SLP
        make_tx(
            3,
            [],
            1,
            genesis_opreturn(&GenesisInfo::empty_slp(), Fungible, None, 1000),
        ),
        // GENESIS ALP
        make_tx(
            4,
            [],
            2,
            sections_opreturn(vec![genesis_section(
                Standard,
                &GenesisInfo::empty_alp(),
                &ParsedMintData {
                    atoms_vec: vec![1000, 2000],
                    num_batons: 0,
                },
            )]),
        ),
        // Actual SLP BURN, recorded in DB
        make_tx(5, [(3, 1)], 0, burn_opreturn(&token_id(3), Fungible, 1000)),
        // Actual ALP BURN, recorded in DB
        make_tx(
            6,
            [(4, 1)],
            0,
            sections_opreturn(vec![burn_section(&token_id(4), Standard, 1000)]),
        ),
    ])?;

    // Empty SLP BURN not recorded
    assert_eq!(token_reader.token_tx(1)?, None);
    // Empty ALP BURN not recorded
    assert_eq!(token_reader.token_tx(2)?, None);
    // Actual SLP BURN
    assert_eq!(
        token_reader.token_tx(5)?,
        Some(DbTokenTx {
            token_tx_nums: vec![3],
            inputs: vec![db_atoms::<0>(1000)],
            outputs: vec![NoToken],
            ..Default::default()
        }),
    );
    // Actual SLP BURN
    assert_eq!(
        token_reader.token_tx(6)?,
        Some(DbTokenTx {
            token_tx_nums: vec![4],
            inputs: vec![db_atoms::<0>(1000)],
            outputs: vec![NoToken],
            ..Default::default()
        }),
    );

    Ok(())
}
