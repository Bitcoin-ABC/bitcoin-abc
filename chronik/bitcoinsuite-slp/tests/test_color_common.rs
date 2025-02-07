// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    hash::ShaRmd160,
    script::{
        opcode::{OP_0, OP_RETURN},
        PubKey, Script, ScriptMut,
    },
    tx::{Tx, TxId, TxMut, TxOutput},
};
use bitcoinsuite_slp::{
    alp::sections_opreturn,
    color::{ColoredTx, FailedParsing, ParseError},
    empp,
};
use bytes::Bytes;

fn make_tx(script: Script) -> Tx {
    Tx::with_txid(
        TxId::new([4; 32]),
        TxMut {
            outputs: vec![TxOutput { sats: 0, script }],
            ..Default::default()
        },
    )
}

#[test]
fn test_color_none() {
    assert_eq!(ColoredTx::color_tx(&Tx::default()), None);
    assert_eq!(ColoredTx::color_tx(&make_tx(Script::default())), None);
    assert_eq!(
        ColoredTx::color_tx(&make_tx(Script::p2pk(&PubKey::default()))),
        None,
    );
    assert_eq!(
        ColoredTx::color_tx(&make_tx(Script::p2pkh(&ShaRmd160::default()))),
        None,
    );
    assert_eq!(
        ColoredTx::color_tx(&make_tx(Script::p2sh(&ShaRmd160::default()))),
        None,
    );
}

#[test]
fn test_color_lokad_ids() {
    // Various ignored LOKAD IDs
    let lokad_ids = [b".xec".as_ref(), b"\x6d\x01", b"SLP3", b"ALP\0"];

    // Test OP_RETURN <LOKAD ID> <other pushes>
    for lokad_id in lokad_ids {
        for n_pushes in 0..10 {
            let mut script = ScriptMut::with_capacity(64);
            script.put_opcodes([OP_RETURN]);
            script.put_pushdata(lokad_id);
            for i in 0..n_pushes {
                script.put_pushdata(&vec![i; i as usize]);
            }
            assert_eq!(ColoredTx::color_tx(&make_tx(script.freeze())), None);
        }
    }

    // Test OP_RETURN OP_RESERVED [<LOKAD ID + other bytes>]*
    for n_pushdata in 0..10 {
        let mut sections = Vec::with_capacity(n_pushdata);
        for idx in 0..n_pushdata {
            let mut pushdata = lokad_ids[idx % lokad_ids.len()].to_vec();
            pushdata.extend_from_slice(&vec![4; n_pushdata]);
            sections.push(pushdata.into());
        }
        assert_eq!(
            ColoredTx::color_tx(&make_tx(sections_opreturn(sections))),
            None,
        );
    }
}

#[test]
fn test_color_invalid_empp() {
    let script = sections_opreturn(vec![Bytes::new()]);
    assert_eq!(
        ColoredTx::color_tx(&make_tx(script.clone())),
        Some(ColoredTx {
            outputs: vec![None],
            failed_parsings: vec![FailedParsing {
                pushdata_idx: None,
                bytes: script.bytecode().clone(),
                error: ParseError::Empp(empp::ParseError::EmptyPushdata(OP_0)),
            }],
            ..Default::default()
        }),
    );
}
