// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::script::Script;
use bitcoinsuite_slp::{
    alp::{genesis_section, mint_section, sections_opreturn, send_section},
    parsed::ParsedMintData,
    slp::{genesis_opreturn, mint_opreturn, send_opreturn},
    structs::GenesisInfo,
    test_helpers::{meta_alp, meta_slp},
    token_type::{AlpTokenType::*, SlpTokenType::*},
};
use pretty_assertions::assert_eq;

use crate::io::token::{
    tests::mock::{make_tx, token_id, MockTokenDb},
    TokenReader,
};

#[test]
fn test_batch_disconnect() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;
    let token_reader = TokenReader::new(&db)?;

    let block0 = [
        make_tx(0, [(0xff, 0)], 2, Script::default()),
        // GENESIS SLP token
        make_tx(
            1,
            [],
            2,
            genesis_opreturn(
                &GenesisInfo::empty_slp(),
                Fungible,
                Some(2),
                1000,
            ),
        ),
        // MINT SLP
        make_tx(
            2,
            [(1, 2)],
            2,
            mint_opreturn(&token_id(1), Fungible, Some(2), 500),
        ),
        // SEND SLP
        make_tx(
            3,
            [(1, 1), (2, 1)],
            2,
            send_opreturn(&token_id(1), Fungible, &[400, 1100]),
        ),
        // GENESIS ALP
        make_tx(
            4,
            [],
            5,
            sections_opreturn(vec![genesis_section(
                Standard,
                &GenesisInfo::empty_alp(),
                &ParsedMintData {
                    atoms_vec: vec![1, 0, 3],
                    num_batons: 2,
                },
            )]),
        ),
        // MINT ALP
        make_tx(
            5,
            [(4, 4)],
            5,
            sections_opreturn(vec![mint_section(
                &token_id(4),
                Standard,
                &ParsedMintData {
                    atoms_vec: vec![4, 0, 0, 5],
                    num_batons: 1,
                },
            )]),
        ),
        // SEND ALP
        make_tx(
            6,
            [(4, 3), (5, 1)],
            3,
            sections_opreturn(vec![send_section(
                &token_id(4),
                Standard,
                [1, 0, 6],
            )]),
        ),
    ];
    mock_db.connect(&block0)?;

    // Verify tokens have been added
    assert!(token_reader.genesis_info(1)?.is_some());
    assert_eq!(
        token_reader.token_meta(1)?,
        Some(meta_slp(token_id(1), Fungible)),
    );
    assert!(token_reader.genesis_info(4)?.is_some());
    assert_eq!(token_reader.token_meta(4)?, Some(meta_alp(token_id(4))));
    for tx_num in 1..=6 {
        assert!(token_reader.token_tx(tx_num)?.is_some());
    }

    let block1 = [
        make_tx(7, [(0xff, 0)], 2, Script::default()),
        // GENESIS another SLP token
        make_tx(
            8,
            [],
            2,
            genesis_opreturn(
                &GenesisInfo::empty_slp(),
                Nft1Group,
                Some(2),
                1000,
            ),
        ),
        // MINT that SLP token
        make_tx(
            9,
            [(8, 2)],
            2,
            mint_opreturn(&token_id(8), Nft1Group, Some(2), 500),
        ),
    ];
    mock_db.connect(&block1)?;
    assert_eq!(
        token_reader.genesis_info(1)?,
        Some(GenesisInfo::empty_slp()),
    );
    assert_eq!(
        token_reader.token_meta(8)?,
        Some(meta_slp(token_id(8), Nft1Group)),
    );

    // Disconnect block1, only removes last two txs
    mock_db.disconnect(&block1)?;
    for tx_num in 8..=9 {
        assert_eq!(token_reader.token_tx(tx_num)?, None);
        assert_eq!(token_reader.genesis_info(tx_num)?, None);
        assert_eq!(token_reader.token_meta(tx_num)?, None);
    }
    // Token data of block0 is still there
    assert!(token_reader.genesis_info(1)?.is_some());
    assert_eq!(
        token_reader.token_meta(1)?,
        Some(meta_slp(token_id(1), Fungible)),
    );
    assert!(token_reader.genesis_info(4)?.is_some());
    assert_eq!(token_reader.token_meta(4)?, Some(meta_alp(token_id(4))));
    for tx_num in 1..=6 {
        assert!(token_reader.token_tx(tx_num)?.is_some());
    }

    // Disconnect block0; now everything is empty
    mock_db.disconnect(&block0)?;
    for tx_num in 1..=9 {
        assert_eq!(token_reader.token_tx(tx_num)?, None);
        assert_eq!(token_reader.genesis_info(tx_num)?, None);
        assert_eq!(token_reader.token_meta(tx_num)?, None);
    }

    Ok(())
}
