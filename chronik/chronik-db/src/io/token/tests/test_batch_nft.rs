// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::script::Script;
use bitcoinsuite_slp::{
    slp::{genesis_opreturn, send_opreturn},
    structs::GenesisInfo,
    test_helpers::meta_slp,
    token_type::SlpTokenType::*,
};
use pretty_assertions::assert_eq;

use crate::io::token::{
    tests::mock::{db_amount, db_baton, make_tx, token_id, MockTokenDb},
    DbToken::NoToken,
    DbTokenTx, TokenReader,
};

fn info(ticker: &'static [u8]) -> GenesisInfo {
    GenesisInfo {
        token_ticker: ticker.into(),
        ..GenesisInfo::empty_slp()
    }
}

#[test]
fn test_batch_slp_nft1() -> Result<()> {
    abc_rust_error::install();
    let (db, _tempdir) = MockTokenDb::setup_db()?;
    let mut mock_db = MockTokenDb::setup(&db)?;
    let token_reader = TokenReader::new(&db)?;
    mock_db.connect(&[
        make_tx(0, [(0xff, 0)], 4, Script::EMPTY),
        make_tx(
            1,
            [],
            2,
            genesis_opreturn(&info(b"NFT GROUP"), Nft1Group, Some(2), 1000),
        ),
        make_tx(
            2,
            [(1, 1)],
            5,
            send_opreturn(&token_id(1), Nft1Group, &[1, 1, 1, 1, 996]),
        ),
        make_tx(
            3,
            [(2, 1)],
            1,
            genesis_opreturn(&info(b"NFT CHILD 1"), Nft1Child, None, 1),
        ),
        make_tx(
            4,
            [(2, 2)],
            1,
            genesis_opreturn(&info(b"NFT CHILD 2"), Nft1Child, None, 1),
        ),
        make_tx(
            5,
            [],
            1,
            genesis_opreturn(&info(b"NFT CHILD 3"), Nft1Child, None, 1),
        ),
    ])?;
    assert_eq!(
        token_reader.token_tx(1)?,
        Some(DbTokenTx {
            token_tx_nums: vec![1],
            inputs: vec![],
            outputs: vec![NoToken, db_amount::<0>(1000), db_baton::<0>()],
            ..Default::default()
        }),
    );
    assert_eq!(
        token_reader.token_meta(1)?,
        Some(meta_slp(token_id(1), Nft1Group)),
    );
    assert_eq!(token_reader.genesis_info(1)?, Some(info(b"NFT GROUP")));

    assert_eq!(
        token_reader.token_tx(2)?,
        Some(DbTokenTx {
            token_tx_nums: vec![1],
            inputs: vec![db_amount::<0>(1000)],
            outputs: vec![
                NoToken,
                db_amount::<0>(1),
                db_amount::<0>(1),
                db_amount::<0>(1),
                db_amount::<0>(1),
                db_amount::<0>(996),
            ],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.token_meta(2)?, None);
    assert_eq!(token_reader.genesis_info(2)?, None);

    assert_eq!(
        token_reader.token_tx(3)?,
        Some(DbTokenTx {
            token_tx_nums: vec![3, 1],
            group_token_indices: vec![(0, 1)].into_iter().collect(),
            inputs: vec![db_amount::<1>(1)],
            outputs: vec![NoToken, db_amount::<0>(1)],
            ..Default::default()
        }),
    );
    assert_eq!(
        token_reader.token_meta(3)?,
        Some(meta_slp(token_id(3), Nft1Child)),
    );
    assert_eq!(token_reader.genesis_info(3)?, Some(info(b"NFT CHILD 1")));

    assert_eq!(
        token_reader.token_tx(4)?,
        Some(DbTokenTx {
            token_tx_nums: vec![4, 1],
            group_token_indices: vec![(0, 1)].into_iter().collect(),
            inputs: vec![db_amount::<1>(1)],
            outputs: vec![NoToken, db_amount::<0>(1)],
            ..Default::default()
        }),
    );
    assert_eq!(
        token_reader.token_meta(4)?,
        Some(meta_slp(token_id(4), Nft1Child)),
    );
    assert_eq!(token_reader.genesis_info(4)?, Some(info(b"NFT CHILD 2")));

    assert_eq!(
        token_reader.token_tx(5)?,
        Some(DbTokenTx {
            token_tx_nums: vec![],
            inputs: vec![],
            outputs: vec![NoToken, NoToken],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.token_meta(5)?, None);
    assert_eq!(token_reader.genesis_info(5)?, None);

    mock_db.connect(&[
        make_tx(6, [(0xff, 0)], 4, Script::EMPTY),
        make_tx(
            7,
            [(2, 3)],
            1,
            genesis_opreturn(&info(b"NFT CHILD 4"), Nft1Child, None, 1),
        ),
        make_tx(8, [(2, 4), (3, 1), (5, 1), (7, 1)], 1, Script::default()),
    ])?;

    assert_eq!(
        token_reader.token_tx(7)?,
        Some(DbTokenTx {
            token_tx_nums: vec![7, 1],
            group_token_indices: vec![(0, 1)].into_iter().collect(),
            inputs: vec![db_amount::<1>(1)],
            outputs: vec![NoToken, db_amount::<0>(1)],
            ..Default::default()
        }),
    );
    assert_eq!(
        token_reader.token_meta(7)?,
        Some(meta_slp(token_id(7), Nft1Child)),
    );
    assert_eq!(token_reader.genesis_info(7)?, Some(info(b"NFT CHILD 4")));

    assert_eq!(
        token_reader.token_tx(8)?,
        Some(DbTokenTx {
            token_tx_nums: vec![1, 3, 7],
            group_token_indices: vec![(1, 0), (2, 0)].into_iter().collect(),
            inputs: vec![
                db_amount::<0>(1),
                db_amount::<1>(1),
                NoToken,
                db_amount::<2>(1)
            ],
            outputs: vec![NoToken, NoToken],
            ..Default::default()
        }),
    );
    assert_eq!(token_reader.token_meta(8)?, None);
    assert_eq!(token_reader.genesis_info(8)?, None);

    Ok(())
}
